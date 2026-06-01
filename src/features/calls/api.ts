import { api } from '../../lib/axios'
import type {
  CallDTO,
  InitiateCallRequest,
  InitiateCallResponse,
  InitiateGroupCallRequest,
  JoinCallResponse,
  GroupCallParticipant,
} from '../../types/call'

export const callApi = {
  initiate: (data: InitiateCallRequest) =>
    api.post<InitiateCallResponse>('/api/calls/initiate', data).then((r) => r.data),

  initiateGroup: (data: InitiateGroupCallRequest) =>
    api.post<InitiateCallResponse>('/api/calls/group/initiate', data).then((r) => r.data),

  accept: (callId: number) =>
    api.post(`/api/calls/${callId}/accept`),

  reject: (callId: number) =>
    api.post(`/api/calls/${callId}/reject`),

  end: (callId: number) =>
    api.post(`/api/calls/${callId}/end`),

  join: (callId: number) =>
    api.post<JoinCallResponse>(`/api/calls/${callId}/join`).then((r) => r.data),

  leave: (callId: number) =>
    api.post(`/api/calls/${callId}/leave`),

  participants: (callId: number) =>
    api.get<GroupCallParticipant[]>(`/api/calls/${callId}/participants`).then((r) => r.data),

  history: () =>
    api.get<CallDTO[]>('/api/calls/history').then((r) => r.data),
}
