import { useState } from 'react'
import type { PollDTO } from '../../../types/chat'
import { pollsApi } from '../api'
import { useChatStore } from '../../../store/chatStore'

interface PollBubbleProps {
  messageId: number
  poll: PollDTO
  isOwn: boolean
}

export function PollBubble({ messageId, poll, isOwn }: PollBubbleProps) {
  const [voting, setVoting] = useState(false)
  const updateMessagePoll = useChatStore((s) => s.updateMessagePoll)

  const myVotedOption = poll.options.find((o) => o.votedByMe)
  const hasVoted = !!myVotedOption

  const handleVote = async (optionId: number) => {
    if (voting) return
    setVoting(true)
    try {
      let updatedPoll: PollDTO
      if (myVotedOption?.id === optionId && !poll.allowsMultiple) {
        updatedPoll = await pollsApi.removeVote(poll.id, optionId)
      } else {
        updatedPoll = await pollsApi.vote(poll.id, optionId)
      }
      updateMessagePoll(messageId, updatedPoll)
    } catch {
      // silently ignore
    } finally {
      setVoting(false)
    }
  }

  const bubbleBg = isOwn
    ? 'bg-[var(--bubble-outgoing,#d1f4cc)] dark:bg-[var(--bubble-outgoing-dm,#1a472a)]'
    : 'bg-white dark:bg-gray-800'

  return (
    <div className={`${bubbleBg} rounded-2xl p-3 min-w-[180px] w-full max-w-xs sm:max-w-sm shadow-sm`}>
      {/* Poll icon + question */}
      <div className="flex items-start gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
          {poll.question}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0
            ? Math.round((option.voteCount / poll.totalVotes) * 100)
            : 0
          const isMyVote = option.votedByMe

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voting}
              className={`relative w-full text-left rounded-xl overflow-hidden transition-all
                ${isMyVote
                  ? 'ring-2 ring-primary-400 dark:ring-primary-500'
                  : 'hover:ring-1 hover:ring-primary-200 dark:hover:ring-primary-700'
                }
                ${voting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Vote % bar background */}
              <div
                className="absolute inset-0 bg-primary-100 dark:bg-primary-900/40 transition-all duration-500"
                style={{ width: hasVoted ? `${pct}%` : '0%' }}
              />

              <div className="relative flex items-center justify-between px-3 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Checkmark if voted */}
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                    ${isMyVote
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isMyVote && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{option.text}</span>
                </div>

                {/* Vote count / percentage */}
                {hasVoted && (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {poll.totalVotes === 0
            ? 'Sin votos aún'
            : `${poll.totalVotes} ${poll.totalVotes === 1 ? 'voto' : 'votos'}`}
        </span>
        {poll.allowsMultiple && (
          <span className="text-[10px] text-primary-500 dark:text-primary-400 font-medium">
            Múltiples respuestas
          </span>
        )}
      </div>
    </div>
  )
}
