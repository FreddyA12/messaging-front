export type CallType = 'VOICE' | 'VIDEO'
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED'
export type CallEndReason = 'HANGUP' | 'REJECTED' | 'MISSED' | 'ERROR' | 'BUSY'

export interface GroupCallParticipant {
  userId: number
  userName: string
}

export interface CallDTO {
  id: number
  chatId: number | null
  callerId: number
  calleeId: number | null
  callerName: string
  calleeName: string | null
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

export interface InitiateGroupCallRequest {
  chatId: number
  type: CallType
}

export interface InitiateCallResponse {
  callId: number
}

export interface JoinCallResponse {
  callId: number
  participants: GroupCallParticipant[]
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

export interface CallGroupInviteEvent {
  type: 'CALL_GROUP_INVITE'
  payload: {
    callId: number
    chatId: number
    chatName: string
    from: number
    fromName: string
    callType: CallType
  }
}

export interface CallParticipantJoinedEvent {
  type: 'CALL_PARTICIPANT_JOINED'
  payload: {
    callId: number
    userId: number
    userName: string
  }
}

export interface CallParticipantLeftEvent {
  type: 'CALL_PARTICIPANT_LEFT'
  payload: {
    callId: number
    userId: number
  }
}

export type CallSignalingEvent =
  | CallOfferEvent
  | CallAnswerEvent
  | CallIceCandidateEvent
  | CallEndedEvent
  | CallEscalateEvent
  | CallGroupInviteEvent
  | CallParticipantJoinedEvent
  | CallParticipantLeftEvent
