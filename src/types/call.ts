export type CallType = 'VOICE' | 'VIDEO'
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED'
export type CallEndReason = 'HANGUP' | 'REJECTED' | 'MISSED' | 'ERROR' | 'BUSY'

export interface CallDTO {
  id: number
  chatId: number | null
  callerId: number
  calleeId: number
  callerName: string
  calleeName: string
  type: CallType
  status: CallStatus
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
}

export interface InitiateCallRequest {
  calleeId: number
  chatId?: number
  type: CallType
}

export interface InitiateCallResponse {
  callId: number
}

export interface CallOfferEvent {
  type: 'CALL_OFFER'
  payload: {
    callId: number
    from: number
    fromName: string
    callType: CallType
    sdp: RTCSessionDescriptionInit
  }
}

export interface CallAnswerEvent {
  type: 'CALL_ANSWER'
  payload: {
    callId: number
    from: number
    sdp: RTCSessionDescriptionInit
  }
}

export interface CallIceCandidateEvent {
  type: 'CALL_ICE_CANDIDATE'
  payload: {
    callId: number
    from: number
    candidate: RTCIceCandidateInit
  }
}

export interface CallEndedEvent {
  type: 'CALL_ENDED'
  payload: {
    callId: number
    reason: CallEndReason
  }
}

export interface CallEscalateEvent {
  type: 'CALL_ESCALATE'
  payload: {
    callId: number
    from: number
    enableVideo: boolean
  }
}

export type CallSignalingEvent =
  | CallOfferEvent
  | CallAnswerEvent
  | CallIceCandidateEvent
  | CallEndedEvent
  | CallEscalateEvent
