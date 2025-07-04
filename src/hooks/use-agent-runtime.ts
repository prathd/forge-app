'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAgentStore } from '@/lib/store/agent-store'
import { AgentRuntime } from '@/lib/sdk/agent-runtime'
import type { Message, QueryOptions } from '@/types/agent'

// Create a singleton runtime instance
let runtimeInstance: AgentRuntime | null = null

function getRuntime(): AgentRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new AgentRuntime()
  }
  return runtimeInstance
}

export function useAgentRuntime(agentId: string | null) {
  const runtime = useRef(getRuntime())
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { getAgent, updateAgent } = useAgentStore()
  const agent = agentId ? getAgent(agentId) : null

  // Initialize agent in runtime
  useEffect(() => {
    if (!agent || !agentId) return

    const initAgent = async () => {
      try {
        // Check if agent already exists in runtime
        const existingAgent = runtime.current.getAgent(agentId)
        if (!existingAgent) {
          await runtime.current.createAgent({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            systemPrompt: agent.systemPrompt,
            workingDirectory: agent.workingDirectory,
            branch: agent.branch,
          })
        }

        // Set up message handler
        runtime.current.onMessage(agentId, (message) => {
          setMessages(prev => {
            // Handle streaming messages
            if (message.role === 'assistant_stream') {
              // Find the last assistant message and append to it
              const lastIndex = prev.findLastIndex(m => m.role === 'assistant')
              if (lastIndex !== -1) {
                const updated = [...prev]
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: updated[lastIndex].content + message.content
                }
                return updated
              } else {
                // Convert first stream to assistant message
                return [...prev, { ...message, role: 'assistant' }]
              }
            }
            return [...prev, message]
          })
        })

        // Set up status handler
        runtime.current.onStatusChange(agentId, (status) => {
          updateAgent(agentId, { status })
        })

        // Load existing messages if any
        const runningAgent = runtime.current.getAgent(agentId)
        if (runningAgent) {
          setMessages(runningAgent.messages)
        }
      } catch (err) {
        console.error('Failed to initialize agent:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize agent')
      }
    }

    initAgent()

    return () => {
      // Cleanup is handled by the runtime
    }
  }, [agent, agentId, updateAgent])

  const sendMessage = useCallback(async (
    prompt: string,
    options?: QueryOptions
  ) => {
    if (!agentId || !agent) return

    setIsLoading(true)
    setError(null)

    try {
      const messageStream = runtime.current.query(agentId, prompt, options)
      
      for await (const _message of messageStream) {
        // Messages are handled by the message handler
        // This loop just consumes the stream
      }
    } catch (err) {
      console.error('Query error:', err)
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setIsLoading(false)
    }
  }, [agentId, agent])

  const abortQuery = useCallback(() => {
    if (agentId) {
      runtime.current.abort(agentId)
    }
  }, [agentId])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const exportConversation = useCallback(() => {
    if (!agentId) return null
    return runtime.current.exportConversation(agentId)
  }, [agentId])

  const setWorkingDirectory = useCallback((path: string) => {
    if (agentId) {
      runtime.current.setWorkingDirectory(agentId, path)
      updateAgent(agentId, { workingDirectory: path })
    }
  }, [agentId, updateAgent])

  const setSystemPrompt = useCallback((prompt: string) => {
    if (agentId) {
      runtime.current.setSystemPrompt(agentId, prompt)
      updateAgent(agentId, { systemPrompt: prompt })
    }
  }, [agentId, updateAgent])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    abortQuery,
    clearMessages,
    exportConversation,
    setWorkingDirectory,
    setSystemPrompt,
  }
}