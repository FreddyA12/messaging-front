import { useEffect, useRef } from 'react'
import { connectSocket, subscribe } from '../../../lib/socket'
import { useWebRTC } from '../hooks/useWebRTC'
import { useCallStore } from '../../../store/callStore'
import { useAuthStore } from '../../../store/authStore'
import { IncomingCallOverlay } from './IncomingCallOverlay'
import { CallScreen } from './CallScreen'
import type {
  CallSignalingEvent,
  CallOfferEvent,
  CallAnswerEvent,
  CallIceCandidateEvent,
  CallEndedEvent,
  CallEscalateEvent,
} from '../../../types/call'

export function CallManager() {
  const call = useCallStore((s) => s.call)
  const pendingStart = useCallStore((s) => s.pendingStart)
  const clearPendingStart = useCallStore((s) => s.clearPendingStart)
  const startIncoming = useCallStore((s) => s.startIncoming)
  const setPhase = useCallStore((s) => s.setPhase)
  const setEndReason = useCallStore((s) => s.setEndReason)
  const setType = useCallStore((s) => s.setType)
  const endCallInStore = useCallStore((s) => s.endCall)
  const setMissedCallsCount = useCallStore((s) => s.setMissedCallsCount)
  const user = useAuthStore((s) => s.user)

  const webrtc = useWebRTC()
  const webrtcRef = useRef(webrtc)
  webrtcRef.current = webrtc

  useEffect(() => {
    if (!pendingStart) return
    const { peerId, peerName, type, chatId } = pendingStart
    clearPendingStart()
    webrtcRef.current
      .startCall(peerId, peerName, type, chatId)
      .catch((err) => {
        console.error('Failed to start call', err)
        endCallInStore()
      })
  }, [pendingStart, clearPendingStart, endCallInStore])

  useEffect(() => {
    if (!user) return
    let sub: { unsubscribe: () => void } | null = null

    connectSocket()
      .then(() => {
        sub = subscribe('/user/queue/calls', (body) => {
          const event = body as CallSignalingEvent
          const rtc = webrtcRef.current
          switch (event.type) {
            case 'CALL_OFFER': {
              const offer = event as CallOfferEvent
              const currentCall = useCallStore.getState().call
              if (!currentCall) {
                rtc.onOffer(offer)
                startIncoming({
                  callId: offer.payload.callId,
                  type: offer.payload.callType,
                  peerId: offer.payload.from,
                  peerName: offer.payload.fromName,
                })
              } else if (currentCall.callId === offer.payload.callId) {
                rtc.onOffer(offer)
              }
              break
            }
            case 'CALL_ANSWER': {
              const ans = event as CallAnswerEvent
              rtc.onAnswer(ans)
              break
            }
            case 'CALL_ICE_CANDIDATE': {
              const ice = event as CallIceCandidateEvent
              rtc.onIceCandidate(ice)
              break
            }
            case 'CALL_ENDED': {
              const ended = event as CallEndedEvent
              const currentCall = useCallStore.getState().call
              if (currentCall && currentCall.callId === ended.payload.callId) {
                if (ended.payload.reason === 'REJECTED') {
                  setEndReason('REJECTED')
                  setPhase('ENDED')
                } else {
                  if (currentCall.phase === 'RINGING_IN' && ended.payload.reason === 'MISSED') {
                    setMissedCallsCount(useCallStore.getState().missedCallsCount + 1)
                  }
                  rtc.onRemoteEnd()
                }
              }
              break
            }
            case 'CALL_ESCALATE': {
              const esc = event as CallEscalateEvent
              if (esc.payload.enableVideo) {
                rtc.onEscalate().catch((err) => console.warn('onEscalate failed', err))
              }
              break
            }
          }
        })
      })
      .catch((err) => console.error('Call signaling subscription failed:', err))

    return () => {
      sub?.unsubscribe()
    }
  }, [user, startIncoming, setPhase, setEndReason, setType, setMissedCallsCount])

  // Auto-close call screen when phase reaches ENDED (hang up from either side, rejection, connection lost)
  useEffect(() => {
    if (call?.phase !== 'ENDED') return
    const timer = setTimeout(() => {
      webrtcRef.current.endCall(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [call?.phase])

  if (!call) return null

  if (call.phase === 'RINGING_IN') {
    return (
      <IncomingCallOverlay
        peerName={call.peerName}
        type={call.type}
        onAccept={webrtc.acceptCall}
        onReject={webrtc.rejectCall}
      />
    )
  }

  return (
    <CallScreen
      call={call}
      localStream={webrtc.localStream}
      remoteStream={webrtc.remoteStream}
      onToggleMute={webrtc.toggleMute}
      onToggleCamera={webrtc.toggleCamera}
      onSwitchCamera={webrtc.switchCamera}
      onEscalate={webrtc.escalateToVideo}
      onEnd={() => webrtc.endCall(true)}
    />
  )
}
