import { useCallback, useEffect, useRef, useState } from 'react'
import { publish } from '../../../lib/socket'
import { useCallStore } from '../../../store/callStore'
import { callApi } from '../api'
import type {
  CallType,
  CallOfferEvent,
  CallAnswerEvent,
  CallIceCandidateEvent,
} from '../../../types/call'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

async function getUserMedia(audio: boolean, video: boolean): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Tu navegador bloquea el acceso a cámara/micrófono en conexiones HTTP. ' +
      'Abre chrome://flags/#unsafely-treat-insecure-origin-as-secure, añade la URL de esta app y reinicia Chrome.'
    )
  }
  return navigator.mediaDevices.getUserMedia({
    audio,
    video: video
      ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      : false,
  })
}

export interface UseGroupWebRTCResult {
  localStream: MediaStream | null
  remoteStreams: Map<number, MediaStream>
  startGroupCall: (chatId: number, chatName: string, type: CallType) => Promise<void>
  joinGroupCall: () => Promise<void>
  rejectGroupCall: () => Promise<void>
  leaveGroupCall: (notifyServer?: boolean) => Promise<void>
  toggleMute: () => void
  toggleCamera: () => void
  onOffer: (event: CallOfferEvent) => void
  onAnswer: (event: CallAnswerEvent) => Promise<void>
  onIceCandidate: (event: CallIceCandidateEvent) => Promise<void>
  onParticipantJoined: (userId: number, userName: string) => Promise<void>
  onParticipantLeft: (userId: number) => void
}

export function useGroupWebRTC(): UseGroupWebRTCResult {
  const call = useCallStore((s) => s.call)
  const startGroupOutgoing = useCallStore((s) => s.startGroupOutgoing)
  const setActive = useCallStore((s) => s.setActive)
  const setPhase = useCallStore((s) => s.setPhase)
  const setMuted = useCallStore((s) => s.setMuted)
  const setCameraOff = useCallStore((s) => s.setCameraOff)
  const addGroupParticipant = useCallStore((s) => s.addGroupParticipant)
  const removeGroupParticipant = useCallStore((s) => s.removeGroupParticipant)
  const endCallInStore = useCallStore((s) => s.endCall)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map())

  // Per-peer state
  const pcsRef = useRef<Map<number, RTCPeerConnection>>(new Map())
  const remoteTracksRef = useRef<Map<number, Map<string, MediaStreamTrack>>>(new Map())
  const pendingOffersRef = useRef<Map<number, RTCSessionDescriptionInit>>(new Map())
  const pendingCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)

  const stopLocalTracks = useCallback(() => {
    setLocalStream((stream) => {
      stream?.getTracks().forEach((t) => t.stop())
      return null
    })
    localStreamRef.current = null
  }, [])

  const closePeerConnection = useCallback((peerId: number) => {
    pcsRef.current.get(peerId)?.close()
    pcsRef.current.delete(peerId)
    remoteTracksRef.current.delete(peerId)
    pendingOffersRef.current.delete(peerId)
    pendingCandidatesRef.current.delete(peerId)
    setRemoteStreams((prev) => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  const cleanup = useCallback(() => {
    for (const peerId of [...pcsRef.current.keys()]) {
      pcsRef.current.get(peerId)?.close()
    }
    pcsRef.current.clear()
    remoteTracksRef.current.clear()
    pendingOffersRef.current.clear()
    pendingCandidatesRef.current.clear()
    stopLocalTracks()
    setRemoteStreams(new Map())
  }, [stopLocalTracks])

  const drainCandidates = useCallback(async (peerId: number) => {
    const pc = pcsRef.current.get(peerId)
    if (!pc?.remoteDescription) return
    const pending = pendingCandidatesRef.current.get(peerId) ?? []
    pendingCandidatesRef.current.set(peerId, [])
    for (const c of pending) {
      try { await pc.addIceCandidate(c) } catch { /* stale */ }
    }
  }, [])

  const createPeerConnection = useCallback(
    (callId: number, peerId: number): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          publish('/app/call.ice', {
            callId,
            to: peerId,
            candidate: candidate.toJSON(),
          }).catch(() => {})
        }
      }

      pc.ontrack = ({ track }) => {
        if (!remoteTracksRef.current.has(peerId)) {
          remoteTracksRef.current.set(peerId, new Map())
        }
        remoteTracksRef.current.get(peerId)!.set(track.id, track)
        const tracks = [...remoteTracksRef.current.get(peerId)!.values()]
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.set(peerId, new MediaStream(tracks))
          return next
        })
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setActive()
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed' ||
          pc.connectionState === 'disconnected'
        ) {
          // Remove just this peer's connection
          closePeerConnection(peerId)
          removeGroupParticipant(peerId)
        }
      }

      return pc
    },
    [setActive, closePeerConnection, removeGroupParticipant],
  )

  const startGroupCall = useCallback<UseGroupWebRTCResult['startGroupCall']>(
    async (chatId, chatName, type) => {
      try {
        // Request media first — must happen before any async network call so the
        // browser's user-activation context is still valid for getUserMedia.
        const stream = await getUserMedia(true, type === 'VIDEO')
        setLocalStream(stream)
        localStreamRef.current = stream

        const { callId } = await callApi.initiateGroup({ chatId, type })
        startGroupOutgoing({ callId, type, chatId, chatName })

        // No peer connections yet — they'll be created as participants join
      } catch (err) {
        console.error('startGroupCall failed:', err)
        cleanup()
        endCallInStore()
        throw err
      }
    },
    [startGroupOutgoing, cleanup, endCallInStore],
  )

  const joinGroupCall = useCallback<UseGroupWebRTCResult['joinGroupCall']>(async () => {
    if (!call || !call.isGroup) return
    try {
      setPhase('CONNECTING')

      const stream = await getUserMedia(true, call.type === 'VIDEO')
      setLocalStream(stream)
      localStreamRef.current = stream

      const { participants } = await callApi.join(call.callId)

      // Create a PC for each existing participant and add local tracks
      for (const p of participants) {
        addGroupParticipant(p)
        if (!pcsRef.current.has(p.userId)) {
          const pc = createPeerConnection(call.callId, p.userId)
          pcsRef.current.set(p.userId, pc)
          stream.getTracks().forEach((t) => pc.addTrack(t, stream))
        }

        // If an offer arrived before we set up the PC, process it now
        const pendingOffer = pendingOffersRef.current.get(p.userId)
        if (pendingOffer) {
          const pc = pcsRef.current.get(p.userId)!
          pendingOffersRef.current.delete(p.userId)
          await pc.setRemoteDescription(pendingOffer)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await publish('/app/call.answer', { callId: call.callId, to: p.userId, sdp: answer })
          await drainCandidates(p.userId)
        }
      }
    } catch (err) {
      console.error('joinGroupCall failed:', err)
      cleanup()
      endCallInStore()
    }
  }, [call, createPeerConnection, setPhase, addGroupParticipant, drainCandidates, cleanup, endCallInStore])

  const rejectGroupCall = useCallback<UseGroupWebRTCResult['rejectGroupCall']>(async () => {
    cleanup()
    endCallInStore()
  }, [cleanup, endCallInStore])

  const leaveGroupCall = useCallback<UseGroupWebRTCResult['leaveGroupCall']>(
    async (notifyServer = true) => {
      const currentCall = call
      cleanup()
      endCallInStore()
      if (notifyServer && currentCall) {
        try { await callApi.leave(currentCall.callId) } catch { /* already left */ }
      }
    },
    [call, cleanup, endCallInStore],
  )

  const onOffer = useCallback<UseGroupWebRTCResult['onOffer']>(
    (event) => {
      const peerId = event.payload.from
      const currentCall = useCallStore.getState().call
      if (!currentCall?.isGroup) return

      const pc = pcsRef.current.get(peerId)
      const stream = localStreamRef.current

      if (pc && stream) {
        // PC exists and stream ready — process immediately
        const callId = currentCall.callId
        const processOffer = async () => {
          try {
            await pc.setRemoteDescription(event.payload.sdp)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await publish('/app/call.answer', { callId, to: peerId, sdp: answer })
            await drainCandidates(peerId)
          } catch (err) {
            console.warn('processOffer failed for peer', peerId, err)
          }
        }
        processOffer()
      } else {
        // Store offer to process once PC/stream are ready
        pendingOffersRef.current.set(peerId, event.payload.sdp)
      }
    },
    [drainCandidates],
  )

  const onAnswer = useCallback<UseGroupWebRTCResult['onAnswer']>(
    async (event) => {
      const peerId = event.payload.from
      const pc = pcsRef.current.get(peerId)
      if (!pc) return
      try {
        await pc.setRemoteDescription(event.payload.sdp)
        await drainCandidates(peerId)
      } catch (err) {
        console.warn('onAnswer failed for peer', peerId, err)
      }
    },
    [drainCandidates],
  )

  const onIceCandidate = useCallback<UseGroupWebRTCResult['onIceCandidate']>(
    async (event) => {
      const peerId = event.payload.from
      const pc = pcsRef.current.get(peerId)
      if (!pc?.remoteDescription) {
        const existing = pendingCandidatesRef.current.get(peerId) ?? []
        pendingCandidatesRef.current.set(peerId, [...existing, event.payload.candidate])
        return
      }
      try { await pc.addIceCandidate(event.payload.candidate) } catch { /* stale */ }
    },
    [],
  )

  const onParticipantJoined = useCallback<UseGroupWebRTCResult['onParticipantJoined']>(
    async (userId, userName) => {
      const currentCall = useCallStore.getState().call
      if (!currentCall?.isGroup) return
      const stream = localStreamRef.current
      if (!stream) return

      addGroupParticipant({ userId, userName })

      // Create PC for the new participant and send offer
      if (!pcsRef.current.has(userId)) {
        const pc = createPeerConnection(currentCall.callId, userId)
        pcsRef.current.set(userId, pc)
        stream.getTracks().forEach((t) => pc.addTrack(t, stream))

        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: currentCall.type === 'VIDEO',
          })
          await pc.setLocalDescription(offer)
          await publish('/app/call.offer', {
            callId: currentCall.callId,
            to: userId,
            callType: currentCall.type,
            sdp: offer,
          })
        } catch (err) {
          console.warn('Failed to create offer for new participant', userId, err)
        }
      }
    },
    [addGroupParticipant, createPeerConnection],
  )

  const onParticipantLeft = useCallback<UseGroupWebRTCResult['onParticipantLeft']>(
    (userId) => {
      closePeerConnection(userId)
      removeGroupParticipant(userId)
    },
    [closePeerConnection, removeGroupParticipant],
  )

  const toggleMute = useCallback(() => {
    const currentCall = useCallStore.getState().call
    if (!localStreamRef.current || !currentCall) return
    const next = !currentCall.muted
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next })
    setMuted(next)
  }, [setMuted])

  const toggleCamera = useCallback(() => {
    const currentCall = useCallStore.getState().call
    if (!localStreamRef.current || !currentCall) return
    const next = !currentCall.cameraOff
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !next })
    setCameraOff(next)
  }, [setCameraOff])

  useEffect(() => () => { cleanup() }, [cleanup])

  return {
    localStream,
    remoteStreams,
    startGroupCall,
    joinGroupCall,
    rejectGroupCall,
    leaveGroupCall,
    toggleMute,
    toggleCamera,
    onOffer,
    onAnswer,
    onIceCandidate,
    onParticipantJoined,
    onParticipantLeft,
  }
}
