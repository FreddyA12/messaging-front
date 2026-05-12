import { create } from 'zustand'
import type { CallType } from '../types/call'

export type CallPhase = 'IDLE' | 'RINGING_OUT' | 'RINGING_IN' | 'CONNECTING' | 'ACTIVE' | 'ENDED'

export interface ActiveCall {
  callId: number
  phase: CallPhase
  type: CallType
  isCaller: boolean
  peerId: number
  peerName: string
  startedAt: number | null
  muted: boolean
  cameraOff: boolean
}

export interface PendingOutgoingCall {
  peerId: number
  peerName: string
  type: CallType
  chatId?: number
}

interface CallState {
  call: ActiveCall | null
  pendingStart: PendingOutgoingCall | null
  missedCallsCount: number

  requestOutgoingCall: (data: PendingOutgoingCall) => void
  clearPendingStart: () => void
  setMissedCallsCount: (n: number) => void
  clearMissedCalls: () => void
  startOutgoing: (data: {
    callId: number
    type: CallType
    peerId: number
    peerName: string
  }) => void
  startIncoming: (data: {
    callId: number
    type: CallType
    peerId: number
    peerName: string
  }) => void
  setPhase: (phase: CallPhase) => void
  setActive: () => void
  setType: (type: CallType) => void
  setMuted: (muted: boolean) => void
  setCameraOff: (off: boolean) => void
  endCall: () => void
}

export const useCallStore = create<CallState>((set) => ({
  call: null,
  pendingStart: null,
  missedCallsCount: 0,

  requestOutgoingCall: (data) => set({ pendingStart: data }),
  clearPendingStart: () => set({ pendingStart: null }),
  setMissedCallsCount: (n) => set({ missedCallsCount: n }),
  clearMissedCalls: () => set({ missedCallsCount: 0 }),

  startOutgoing: ({ callId, type, peerId, peerName }) =>
    set({
      call: {
        callId,
        phase: 'RINGING_OUT',
        type,
        isCaller: true,
        peerId,
        peerName,
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
        peerId,
        peerName,
        startedAt: null,
        muted: false,
        cameraOff: false,
      },
    }),

  setPhase: (phase) =>
    set((s) => (s.call ? { call: { ...s.call, phase } } : s)),

  setActive: () =>
    set((s) =>
      s.call
        ? { call: { ...s.call, phase: 'ACTIVE', startedAt: Date.now() } }
        : s,
    ),

  setType: (type) =>
    set((s) => (s.call ? { call: { ...s.call, type } } : s)),

  setMuted: (muted) =>
    set((s) => (s.call ? { call: { ...s.call, muted } } : s)),

  setCameraOff: (off) =>
    set((s) => (s.call ? { call: { ...s.call, cameraOff: off } } : s)),

  endCall: () => set({ call: null, pendingStart: null }),
}))
