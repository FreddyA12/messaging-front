import { useCallback, useEffect, useRef, useState } from 'react'
import { publish } from '../../../lib/socket'
import { useCallStore } from '../../../store/callStore'
import { useAuthStore } from '../../../store/authStore'
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
  return navigator.mediaDevices.getUserMedia({
    audio,
    video: video
      ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      : false,
  })
}

export interface UseWebRTCResult {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  startCall: (peerId: number, peerName: string, type: CallType, chatId?: number) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => Promise<void>
  endCall: (notifyPeer?: boolean) => Promise<void>
  toggleMute: () => void
  toggleCamera: () => void
  switchCamera: () => Promise<void>
  escalateToVideo: () => Promise<void>
  onOffer: (event: CallOfferEvent) => void
  onAnswer: (event: CallAnswerEvent) => Promise<void>
  onIceCandidate: (event: CallIceCandidateEvent) => Promise<void>
  onRemoteEnd: () => void
}

export function useWebRTC(): UseWebRTCResult {
  const call = useCallStore((s) => s.call)
  const startOutgoing = useCallStore((s) => s.startOutgoing)
  const setActive = useCallStore((s) => s.setActive)
  const setPhase = useCallStore((s) => s.setPhase)
  const setType = useCallStore((s) => s.setType)
  const setMuted = useCallStore((s) => s.setMuted)
  const setCameraOff = useCallStore((s) => s.setCameraOff)
  const endCallInStore = useCallStore((s) => s.endCall)
  const currentUser = useAuthStore((s) => s.user)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const facingModeRef = useRef<'user' | 'environment'>('user')

  const stopLocalTracks = useCallback(() => {
    setLocalStream((stream) => {
      stream?.getTracks().forEach((t) => t.stop())
      return null
    })
  }, [])

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    pendingOfferRef.current = null
    pendingCandidatesRef.current = []
    stopLocalTracks()
    setRemoteStream(null)
  }, [stopLocalTracks])

  const drainPendingCandidates = useCallback(async () => {
    const pc = pcRef.current
    if (!pc?.remoteDescription) return
    const pending = [...pendingCandidatesRef.current]
    pendingCandidatesRef.current = []
    for (const c of pending) {
      try { await pc.addIceCandidate(c) } catch { /* candidate may be stale */ }
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

      pc.ontrack = ({ streams }) => {
        setRemoteStream(streams[0] ?? null)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setActive()
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed' ||
          pc.connectionState === 'disconnected'
        ) {
          setPhase('ENDED')
        }
      }

      return pc
    },
    [setActive, setPhase],
  )

  const startCall = useCallback<UseWebRTCResult['startCall']>(
    async (peerId, peerName, type, chatId) => {
      if (!currentUser) return
      try {
        const { callId } = await callApi.initiate({ calleeId: peerId, chatId, type })
        startOutgoing({ callId, type, peerId, peerName })

        const stream = await getUserMedia(true, type === 'VIDEO')
        setLocalStream(stream)

        const pc = createPeerConnection(callId, peerId)
        pcRef.current = pc
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'VIDEO',
        })
        await pc.setLocalDescription(offer)

        // await so the offer is guaranteed to arrive before ICE candidates
        await publish('/app/call.offer', { callId, to: peerId, callType: type, sdp: offer })
      } catch (err) {
        console.error('startCall failed:', err)
        cleanup()
        endCallInStore()
        throw err
      }
    },
    [createPeerConnection, currentUser, startOutgoing, cleanup, endCallInStore],
  )

  const onOffer = useCallback<UseWebRTCResult['onOffer']>(
    (event) => { pendingOfferRef.current = event.payload.sdp },
    [],
  )

  const acceptCall = useCallback<UseWebRTCResult['acceptCall']>(async () => {
    if (!call || !pendingOfferRef.current) return
    try {
      setPhase('CONNECTING')
      await callApi.accept(call.callId)

      const stream = await getUserMedia(true, call.type === 'VIDEO')
      setLocalStream(stream)

      const pc = createPeerConnection(call.callId, call.peerId)
      pcRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      await pc.setRemoteDescription(pendingOfferRef.current)
      pendingOfferRef.current = null

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await publish('/app/call.answer', { callId: call.callId, to: call.peerId, sdp: answer })

      await drainPendingCandidates()
    } catch (err) {
      console.error('acceptCall failed:', err)
      cleanup()
      endCallInStore()
    }
  }, [call, createPeerConnection, drainPendingCandidates, setPhase, cleanup, endCallInStore])

  const rejectCall = useCallback<UseWebRTCResult['rejectCall']>(async () => {
    if (!call) return
    try { await callApi.reject(call.callId) } finally {
      cleanup()
      endCallInStore()
    }
  }, [call, cleanup, endCallInStore])

  const endCall = useCallback<UseWebRTCResult['endCall']>(
    async (notifyPeer = true) => {
      const currentCall = call
      cleanup()
      endCallInStore()
      if (notifyPeer && currentCall) {
        try { await callApi.end(currentCall.callId) } catch { /* already ended */ }
        publish('/app/call.end', { callId: currentCall.callId, to: currentCall.peerId }).catch(() => {})
      }
    },
    [call, cleanup, endCallInStore],
  )

  const onAnswer = useCallback<UseWebRTCResult['onAnswer']>(
    async (event) => {
      const pc = pcRef.current
      if (!pc) return
      setPhase('CONNECTING')
      try {
        await pc.setRemoteDescription(event.payload.sdp)
        await drainPendingCandidates()
      } catch (err) {
        console.error('onAnswer failed:', err)
      }
    },
    [drainPendingCandidates, setPhase],
  )

  const onIceCandidate = useCallback<UseWebRTCResult['onIceCandidate']>(
    async (event) => {
      const pc = pcRef.current
      if (!pc?.remoteDescription) {
        pendingCandidatesRef.current.push(event.payload.candidate)
        return
      }
      try { await pc.addIceCandidate(event.payload.candidate) } catch { /* may be stale */ }
    },
    [],
  )

  const onRemoteEnd = useCallback(() => {
    cleanup()
    endCallInStore()
  }, [cleanup, endCallInStore])

  const toggleMute = useCallback(() => {
    if (!localStream || !call) return
    const next = !call.muted
    localStream.getAudioTracks().forEach((t) => { t.enabled = !next })
    setMuted(next)
  }, [call, localStream, setMuted])

  const toggleCamera = useCallback(() => {
    if (!localStream || !call) return
    const next = !call.cameraOff
    localStream.getVideoTracks().forEach((t) => { t.enabled = !next })
    setCameraOff(next)
  }, [call, localStream, setCameraOff])

  const switchCamera = useCallback(async () => {
    if (!localStream || !pcRef.current) return
    const next: 'user' | 'environment' = facingModeRef.current === 'user' ? 'environment' : 'user'
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      const newTrack = newStream.getVideoTracks()[0]
      if (!newTrack) return
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(newTrack)
      localStream.getVideoTracks().forEach((t) => { localStream.removeTrack(t); t.stop() })
      localStream.addTrack(newTrack)
      facingModeRef.current = next
      setLocalStream(new MediaStream(localStream.getTracks()))
    } catch (err) {
      console.warn('switchCamera failed', err)
    }
  }, [localStream])

  const escalateToVideo = useCallback(async () => {
    if (!call || !pcRef.current || call.type === 'VIDEO') return
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      const videoTrack = videoStream.getVideoTracks()[0]
      if (!videoTrack) return

      pcRef.current.addTrack(videoTrack, localStream ?? videoStream)
      if (localStream) localStream.addTrack(videoTrack)

      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)

      publish('/app/call.offer', { callId: call.callId, to: call.peerId, callType: 'VIDEO', sdp: offer }).catch(() => {})
      publish('/app/call.escalate', { callId: call.callId, to: call.peerId, enableVideo: true }).catch(() => {})
      setType('VIDEO')
      if (localStream) setLocalStream(new MediaStream(localStream.getTracks()))
    } catch (err) {
      console.warn('escalateToVideo failed', err)
    }
  }, [call, localStream, setType])

  useEffect(() => () => { cleanup() }, [cleanup])

  return {
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    escalateToVideo,
    onOffer,
    onAnswer,
    onIceCandidate,
    onRemoteEnd,
  }
}
