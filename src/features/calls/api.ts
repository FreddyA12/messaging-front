import { api } from '../../lib/axios'
import type {
  CallDTO,
  InitiateCallRequest,
  InitiateCallResponse,
} from '../../types/call'

export const callApi = {
  initiate: (data: InitiateCallRequest) =>
    api.post<InitiateCallResponse>('/api/calls/initiate', data).then((r) => r.data),

  accept: (callId: number) =>
    api.post(`/api/calls/${callId}/accept`),

  reject: (callId: number) =>
    api.post(`/api/calls/${callId}/reject`),

  end: (callId: number) =>
    api.post(`/api/calls/${callId}/end`),

  history: () =>
    api.get<CallDTO[]>('/api/calls/history').then((r) => r.data),
}
