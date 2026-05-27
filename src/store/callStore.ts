import { create } from 'zustand'
import type { CallType, CallEndReason, GroupCallParticipant } from '../types/call'

export type CallPhase = 'IDLE' | 'RINGING_OUT' | 'RINGING_IN' | 'CONNECTING' | 'ACTIVE' | 'ENDED'

export interface ActiveCall {
  callId: number
  phase: CallPhase
  type: CallType
  isCaller: boolean
  isGroup: boolean
  // 1:1 calls
  peerId: number
  peerName: string
  // group calls
  chatId?: number
  chatName?: string
  groupParticipants: GroupCallParticipant[]
  startedAt: number | null
  muted: boolean
  cameraOff: boolean
  endReason?: CallEndReason
}

export interface PendingOutgoingCall {
  peerId: number
  peerName: string
  type: CallType
  chatId?: number
}

export interface PendingGroupOutgoingCall {
  chatId: number
  chatName: string
  type: CallType
}

interface CallState {
  call: ActiveCall | null
  pendingStart: PendingOutgoingCall | null
  pendingGroupStart: PendingGroupOutgoingCall | null
  missedCallsCount: number

  requestOutgoingCall: (data: PendingOutgoingCall) => void
  requestGroupOutgoingCall: (data: PendingGroupOutgoingCall) => void
  clearPendingStart: () => void
  clearPendingGroupStart: () => void
  setMissedCallsCount: (n: number) => void
  clearMissedCalls: () => void

  startOutgoing: (data: { callId: number; type: CallType; peerId: number; peerName: string }) => void
  startIncoming: (data: { callId: number; type: CallType; peerId: number; peerName: string }) => void
  startGroupOutgoing: (data: { callId: number; type: CallType; chatId: number; chatName: string }) => void
  startGroupIncoming: (data: { callId: number; type: CallType; chatId: number; chatName: string; fromId: number; fromName: string }) => void

  setPhase: (phase: CallPhase) => void
  setEndReason: (reason: CallEndReason) => void
  setActive: () => void
  setType: (type: CallType) => void
  setMuted: (muted: boolean) => void
  setCameraOff: (off: boolean) => void
  addGroupParticipant: (p: GroupCallParticipant) => void
  removeGroupParticipant: (userId: number) => void
  setGroupParticipants: (participants: GroupCallParticipant[]) => void
  endCall: () => void
}

export const useCallStore = create<CallState>((set) => ({
  call: null,
  pendingStart: null,
  pendingGroupStart: null,
  missedCallsCount: 0,

  requestOutgoingCall: (data) => set({ pendingStart: data }),
  requestGroupOutgoingCall: (data) => set({ pendingGroupStart: data }),
  clearPendingStart: () => set({ pendingStart: null }),
  clearPendingGroupStart: () => set({ pendingGroupStart: null }),
  setMissedCallsCount: (n) => set({ missedCallsCount: n }),
  clearMissedCalls: () => set({ missedCallsCount: 0 }),

  startOutgoing: ({ callId, type, peerId, peerName }) =>
    set({
      call: {
        callId,
        phase: 'RINGING_OUT',
        type,
        isCaller: true,
        isGroup: false,
        peerId,
        peerName,
        groupParticipants: [],
        startedAt: null,
        muted: false,
        cameraOff: false,
      },
    }),

  startIncoming: ({ callId, type, peerId, peerName }) =>
    set({
      call: {
        callId,
        phase: 'RINGING_IN',
        type,
        isCaller: false,
        isGroup: false,
        peerId,
        peerName,
        groupParticipants: [],
        startedAt: null,
        muted: false,
        cameraOff: false,
      },
    }),

  startGroupOutgoing: ({ callId, type, chatId, chatName }) =>
    set({
      call: {
        callId,
        phase: 'RINGING_OUT',
        type,
        isCaller: true,
        isGroup: true,
        peerId: 0,
        peerName: chatName,
        chatId,
        chatName,
        groupParticipants: [],
        startedAt: null,
        muted: false,
        cameraOff: false,
      },
    }),

  startGroupIncoming: ({ callId, type, chatId, chatName, fromId, fromName }) =>
    set({
      call: {
        callId,
        phase: 'RINGING_IN',
        type,
        isCaller: false,
        isGroup: true,
        peerId: fromId,
        peerName: fromName,
        chatId,
        chatName,
        groupParticipants: [],
        startedAt: null,
        muted: false,
        cameraOff: false,
      },
    }),

  setPhase: (phase) =>
    set((s) => (s.call ? { call: { ...s.call, phase } } : s)),

  setEndReason: (reason) =>
    set((s) => (s.call ? { call: { ...s.call, endReason: reason } } : s)),

  setActive: () =>
    set((s) =>
      s.call ? { call: { ...s.call, phase: 'ACTIVE', startedAt: Date.now() } } : s,
    ),

  setType: (type) =>
    set((s) => (s.call ? { call: { ...s.call, type } } : s)),

  setMuted: (muted) =>
    set((s) => (s.call ? { call: { ...s.call, muted } } : s)),

  setCameraOff: (off) =>
    set((s) => (s.call ? { call: { ...s.call, cameraOff: off } } : s)),

  addGroupParticipant: (p) =>
    set((s) => {
      if (!s.call) return s
      const already = s.call.groupParticipants.some((x) => x.userId === p.userId)
      if (already) return s
      return { call: { ...s.call, groupParticipants: [...s.call.groupParticipants, p] } }
    }),

  removeGroupParticipant: (userId) =>
    set((s) => {
      if (!s.call) return s
      return {
        call: {
          ...s.call,
          groupParticipants: s.call.groupParticipants.filter((p) => p.userId !== userId),
        },
      }
    }),

  setGroupParticipants: (participants) =>
    set((s) => (s.call ? { call: { ...s.call, groupParticipants: participants } } : s)),

  endCall: () => set({ call: null, pendingStart: null, pendingGroupStart: null }),
}))
