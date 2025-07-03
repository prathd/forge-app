import { query, type Options } from '@anthropic-ai/claude-code'
import type { 
  Message, 
  QueryOptions,
  ConversationExport,
  MCPExtension 
} from '@/types/agent'

export class ClaudeSDKError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'ClaudeSDKError'
  }
}

export class ClaudeSDK {
  private sessions: Map<string, {
    messages: Message[]
    abortController?: AbortController
  }> = new Map()

  async createSession(agentId: string): Promise<string> {
    const sessionId = `${agentId}-${Date.now()}`
    this.sessions.set(sessionId, { messages: [] })
    return sessionId
  }

  async *query(
    sessionId: string,
    prompt: string,
    options?: QueryOptions
  ): AsyncIterableIterator<Message> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new ClaudeSDKError('Session not found', 'SESSION_NOT_FOUND')
    }

    // Create abort controller if not provided
    const abortController = options?.abortController || new AbortController()
    session.abortController = abortController

    // Add user message to session
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      sessionId
    }
    session.messages.push(userMessage)

    // Convert our options to Claude Code options
    const claudeOptions: Options = {
      abortController,
      allowedTools: options?.allowedTools,
      disallowedTools: options?.disallowedTools,
      maxThinkingTokens: options?.maxThinkingTokens,
      maxTurns: options?.maxTurns,
      model: options?.model,
      fallbackModel: options?.fallbackModel,
      cwd: options?.cwd,
      customSystemPrompt: options?.customSystemPrompt,
      appendSystemPrompt: options?.appendSystemPrompt,
      permissionMode: options?.permissionMode,
      continue: options?.continue,
      resume: options?.resume,
    }

    // Create an async generator that yields our Message format
    async function* messageGenerator(): AsyncIterableIterator<Message> {
      try {
        const response = query({ prompt, abortController, options: claudeOptions })
        
        let assistantContent = ''
        let currentSessionId = sessionId

        for await (const sdkMessage of response) {
          switch (sdkMessage.type) {
            case 'system':
              if (sdkMessage.subtype === 'init') {
                currentSessionId = sdkMessage.session_id
                yield {
                  role: 'system',
                  content: `Initialized with model: ${sdkMessage.model}, tools: ${sdkMessage.tools.join(', ')}`,
                  timestamp: new Date(),
                  sessionId: currentSessionId
                }
              }
              break

            case 'assistant':
              // Accumulate assistant messages
              if (sdkMessage.message.content) {
                for (const block of sdkMessage.message.content) {
                  if (block.type === 'text') {
                    assistantContent += block.text
                  }
                }
              }
              
              // Yield intermediate assistant message
              yield {
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date(),
                sessionId: currentSessionId
              }
              break

            case 'result':
              // Final result message
              if (sdkMessage.subtype === 'success') {
                yield {
                  role: 'system',
                  content: `Completed successfully in ${sdkMessage.num_turns} turns. Total cost: $${sdkMessage.total_cost_usd.toFixed(4)}`,
                  timestamp: new Date(),
                  sessionId: currentSessionId
                }
              } else {
                throw new ClaudeSDKError(
                  `Error: ${sdkMessage.subtype}`,
                  sdkMessage.subtype
                )
              }
              break

            case 'user':
              // Handle user messages in conversation
              break
          }
        }

        // Save final assistant message to session
        if (assistantContent) {
          session!.messages.push({
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
            sessionId: currentSessionId
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ClaudeSDKError('Query aborted', 'ABORTED')
        }
        throw error
      }
    }

    return messageGenerator()
  }

  abort(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session?.abortController) {
      session.abortController.abort()
    }
  }

  getConversation(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId)
    return session?.messages || []
  }

  exportConversation(agentId: string, sessionId: string): ConversationExport {
    const messages = this.getConversation(sessionId)
    
    return {
      agentId,
      messages,
      metadata: {
        createdAt: messages[0]?.timestamp || new Date(),
        updatedAt: messages[messages.length - 1]?.timestamp || new Date(),
        totalTurns: messages.filter(m => m.role === 'user').length,
        totalTokens: 0 // Would need to track this from API responses
      }
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  setWorkingDirectory(sessionId: string, _path: string): void {
    // This would be passed to the query options
    // For now, we'll track it in session metadata
    const session = this.sessions.get(sessionId)
    if (session) {
      // Store as metadata (not implemented in basic version)
    }
  }

  registerMCPExtension(_sessionId: string, _extension: MCPExtension): void {
    // MCP extensions would be passed to the query options
    // This is a placeholder for future implementation
  }
}