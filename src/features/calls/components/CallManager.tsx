import { useEffect, useRef, useState } from 'react'
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

  const [pendingEscalation, setPendingEscalation] = useState<{ peerName: string } | null>(null)

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
                const currentCall = useCallStore.getState().call
                setPendingEscalation({ peerName: currentCall?.peerName ?? 'La otra persona' })
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

  // Auto-close call screen when phase reaches ENDED
  useEffect(() => {
    if (call?.phase !== 'ENDED') return
    const timer = setTimeout(() => {
      webrtcRef.current.endCall(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [call?.phase])

  const handleAcceptEscalation = () => {
    setPendingEscalation(null)
    webrtcRef.current.onEscalate().catch((err) => console.warn('onEscalate failed', err))
  }

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
    <>
      <CallScreen
        call={call}
        localStream={webrtc.localStream}
        remoteStream={webrtc.remoteStream}
        onToggleMute={webrtc.toggleMute}
        onToggleCamera={webrtc.toggleCamera}
        onEscalate={webrtc.escalateToVideo}
        onEnd={() => webrtc.endCall(true)}
      />

      {pendingEscalation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-semibold text-base">
              {pendingEscalation.peerName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-5">
              quiere activar la videollamada
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingEscalation(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={handleAcceptEscalation}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
