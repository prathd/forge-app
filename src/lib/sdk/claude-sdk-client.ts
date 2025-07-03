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

export class ClaudeSDKClient {
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
    _options?: QueryOptions
  ): AsyncIterableIterator<Message> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new ClaudeSDKError('Session not found', 'SESSION_NOT_FOUND')
    }

    // Add user message to session
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      sessionId
    }
    session.messages.push(userMessage)

    // For now, return a mock response
    // In a real implementation, this would communicate with Tauri backend
    async function* messageGenerator(): AsyncIterableIterator<Message> {
      try {
        // Simulate system message
        yield {
          role: 'system',
          content: 'Initializing agent...',
          timestamp: new Date(),
          sessionId
        }

        // Simulate thinking delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Simulate assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: `I received your message: "${prompt}". However, I'm currently in demo mode. To use the full Claude Code functionality, please ensure Claude CLI is installed and authenticated on your system.`,
          timestamp: new Date(),
          sessionId
        }
        
        session!.messages.push(assistantMessage)
        yield assistantMessage

        // Simulate completion
        yield {
          role: 'system',
          content: 'Completed successfully',
          timestamp: new Date(),
          sessionId
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
        totalTokens: 0
      }
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  setWorkingDirectory(_sessionId: string, _path: string): void {
    // Store in session metadata for future use
  }

  registerMCPExtension(_sessionId: string, _extension: MCPExtension): void {
    // Store extension for future use
  }
}