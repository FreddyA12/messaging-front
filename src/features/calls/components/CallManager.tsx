import { useEffect, useRef, useState } from 'react'
import { connectSocket, subscribe } from '../../../lib/socket'
import { useWebRTC } from '../hooks/useWebRTC'
import { useGroupWebRTC } from '../hooks/useGroupWebRTC'
import { useCallStore } from '../../../store/callStore'
import { useAuthStore } from '../../../store/authStore'
import { IncomingCallOverlay } from './IncomingCallOverlay'
import { CallScreen } from './CallScreen'
import { GroupCallScreen } from './GroupCallScreen'
import type {
  CallSignalingEvent,
  CallOfferEvent,
  CallAnswerEvent,
  CallIceCandidateEvent,
  CallEndedEvent,
  CallEscalateEvent,
  CallGroupInviteEvent,
  CallParticipantJoinedEvent,
  CallParticipantLeftEvent,
} from '../../../types/call'

export function CallManager() {
  const call = useCallStore((s) => s.call)
  const pendingStart = useCallStore((s) => s.pendingStart)
  const pendingGroupStart = useCallStore((s) => s.pendingGroupStart)
  const clearPendingStart = useCallStore((s) => s.clearPendingStart)
  const clearPendingGroupStart = useCallStore((s) => s.clearPendingGroupStart)
  const startGroupIncoming = useCallStore((s) => s.startGroupIncoming)
  const startIncoming = useCallStore((s) => s.startIncoming)
  const setPhase = useCallStore((s) => s.setPhase)
  const setEndReason = useCallStore((s) => s.setEndReason)
  const setType = useCallStore((s) => s.setType)
  const endCallInStore = useCallStore((s) => s.endCall)
  const setMissedCallsCount = useCallStore((s) => s.setMissedCallsCount)
  const user = useAuthStore((s) => s.user)

  const [pendingEscalation, setPendingEscalation] = useState<{ peerName: string } | null>(null)

  const webrtc = useWebRTC()
  const groupWebRTC = useGroupWebRTC()

  const webrtcRef = useRef(webrtc)
  webrtcRef.current = webrtc
  const groupWebRTCRef = useRef(groupWebRTC)
  groupWebRTCRef.current = groupWebRTC

  // Start 1:1 outgoing call
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

  // Start group outgoing call
  useEffect(() => {
    if (!pendingGroupStart) return
    const { chatId, chatName, type } = pendingGroupStart
    clearPendingGroupStart()
    groupWebRTCRef.current
      .startGroupCall(chatId, chatName, type)
      .catch((err) => {
        console.error('Failed to start group call', err)
        endCallInStore()
      })
  }, [pendingGroupStart, clearPendingGroupStart, endCallInStore])

  // Signaling subscription
  useEffect(() => {
    if (!user) return
    let sub: { unsubscribe: () => void } | null = null

    connectSocket()
      .then(() => {
        sub = subscribe('/user/queue/calls', (body) => {
          const event = body as CallSignalingEvent
          const rtc = webrtcRef.current
          const grtc = groupWebRTCRef.current
          const currentCall = useCallStore.getState().call

          switch (event.type) {
            case 'CALL_OFFER': {
              const offer = event as CallOfferEvent
              if (currentCall?.isGroup) {
                grtc.onOffer(offer)
              } else if (!currentCall) {
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
              if (currentCall?.isGroup) {
                grtc.onAnswer(ans)
              } else {
                rtc.onAnswer(ans)
              }
              break
            }
            case 'CALL_ICE_CANDIDATE': {
              const ice = event as CallIceCandidateEvent
              if (currentCall?.isGroup) {
                grtc.onIceCandidate(ice)
              } else {
                rtc.onIceCandidate(ice)
              }
              break
            }
            case 'CALL_ENDED': {
              const ended = event as CallEndedEvent
              if (currentCall && currentCall.callId === ended.payload.callId && !currentCall.isGroup) {
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
              if (esc.payload.enableVideo && currentCall && !currentCall.isGroup) {
                setPendingEscalation({ peerName: currentCall.peerName })
              }
              break
            }
            case 'CALL_GROUP_INVITE': {
              const invite = event as CallGroupInviteEvent
              if (!currentCall) {
                startGroupIncoming({
                  callId: invite.payload.callId,
                  type: invite.payload.callType,
                  chatId: invite.payload.chatId,
                  chatName: invite.payload.chatName,
                  fromId: invite.payload.from,
                  fromName: invite.payload.fromName,
                })
              }
              break
            }
            case 'CALL_PARTICIPANT_JOINED': {
              const joined = event as CallParticipantJoinedEvent
              if (currentCall?.isGroup && currentCall.callId === joined.payload.callId) {
                grtc.onParticipantJoined(joined.payload.userId, joined.payload.userName)
              }
              break
            }
            case 'CALL_PARTICIPANT_LEFT': {
              const left = event as CallParticipantLeftEvent
              if (currentCall?.isGroup && currentCall.callId === left.payload.callId) {
                grtc.onParticipantLeft(left.payload.userId)
              }
              break
            }
          }
        })
      })
      .catch((err) => console.error('Call signaling subscription failed:', err))

    return () => { sub?.unsubscribe() }
  }, [user, startIncoming, startGroupIncoming, setPhase, setEndReason, setType, setMissedCallsCount])

  // Auto-close 1:1 call screen when phase reaches ENDED
  useEffect(() => {
    if (call?.phase !== 'ENDED' || call.isGroup) return
    const timer = setTimeout(() => {
      webrtcRef.current.endCall(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [call?.phase, call?.isGroup])

  const handleAcceptEscalation = () => {
    setPendingEscalation(null)
    webrtcRef.current.onEscalate().catch((err) => console.warn('onEscalate failed', err))
  }

  if (!call) return null

  // ── Incoming 1:1 call ─────────────────────────────────────────────
  if (!call.isGroup && call.phase === 'RINGING_IN') {
    return (
      <IncomingCallOverlay
        peerName={call.peerName}
        type={call.type}
        onAccept={webrtc.acceptCall}
        onReject={webrtc.rejectCall}
      />
    )
  }

  // ── Incoming group call ───────────────────────────────────────────
  if (call.isGroup && call.phase === 'RINGING_IN') {
    return (
      <GroupIncomingOverlay
        groupName={call.chatName ?? 'Llamada grupal'}
        callerName={call.peerName}
        type={call.type}
        onAccept={groupWebRTC.joinGroupCall}
        onReject={groupWebRTC.rejectGroupCall}
      />
    )
  }

  // ── Group call screen ─────────────────────────────────────────────
  if (call.isGroup) {
    return (
      <GroupCallScreen
        call={call}
        localStream={groupWebRTC.localStream}
        remoteStreams={groupWebRTC.remoteStreams}
        currentUserId={user?.id ?? 0}
        currentUserName={user?.name ?? 'Tú'}
        onToggleMute={groupWebRTC.toggleMute}
        onToggleCamera={groupWebRTC.toggleCamera}
        onLeave={() => groupWebRTC.leaveGroupCall(true)}
      />
    )
  }

  // ── 1:1 call screen ───────────────────────────────────────────────
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

// ── Group incoming overlay ──────────────────────────────────────────
interface GroupIncomingProps {
  groupName: string
  callerName: string
  type: 'VOICE' | 'VIDEO'
  onAccept: () => void
  onReject: () => void
}

function GroupIncomingOverlay({ groupName, callerName, type, onAccept, onReject }: GroupIncomingProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-4xl font-semibold animate-pulse">
          {groupName[0]?.toUpperCase() ?? 'G'}
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          {type === 'VIDEO' ? (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          )}
        </div>
      </div>

      <div className="text-center">
        <p className="text-white text-2xl font-semibold">{groupName}</p>
        <p className="text-white/60 text-sm mt-1">
          {callerName} ha iniciado una {type === 'VIDEO' ? 'videollamada grupal' : 'llamada grupal'}
        </p>
      </div>

      <div className="flex gap-8 mt-4">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          >
            <svg className="w-7 h-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
          <span className="text-white/80 text-sm">Ignorar</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          >
            {type === 'VIDEO' ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            )}
          </button>
          <span className="text-white/80 text-sm">Unirse</span>
        </div>
      </div>
    </div>
  )
}
