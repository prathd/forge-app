import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
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

interface CreateSessionResponse {
  sessionId: string
}

interface ErrorResponse {
  error: string
}

interface ClaudeCliStatus {
  installed: boolean
  version?: string
  authenticated: boolean
  error?: string
}

export class ClaudeSDKTauri {
  private sessions: Map<string, {
    messages: Message[]
    unsubscribe?: () => void
  }> = new Map()

  async checkClaudeCliAvailable(): Promise<boolean> {
    try {
      return await invoke<boolean>('check_claude_cli')
    } catch {
      return false
    }
  }

  async getClaudeCliStatus(): Promise<ClaudeCliStatus> {
    try {
      return await invoke<ClaudeCliStatus>('get_claude_cli_status')
    } catch (error: any) {
      // Handle permission errors specifically
      if (error.message?.includes('not allowed') || error.message?.includes('permission')) {
        return {
          installed: false,
          authenticated: false,
          error: 'Permission denied. The app needs permission to check for Claude CLI. Please restart the app and grant the necessary permissions.'
        }
      }
      
      return {
        installed: false,
        authenticated: false,
        error: error.error || error.message || 'Failed to check Claude CLI status'
      }
    }
  }

  async createSession(agentId: string): Promise<string> {
    try {
      const response = await invoke<CreateSessionResponse>('create_session', {
        agentId
      })
      
      this.sessions.set(response.sessionId, { messages: [] })
      return response.sessionId
    } catch (error: any) {
      throw new ClaudeSDKError(
        error.error || 'Failed to create session',
        'SESSION_CREATE_ERROR'
      )
    }
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

    // Add user message to session
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      sessionId
    }
    session.messages.push(userMessage)

    // Create a queue for messages
    const messageQueue: Message[] = []
    let resolver: ((value: IteratorResult<Message>) => void) | null = null
    let finished = false

    // Set up event listeners
    const unsubscribeMessage = await listen<Message>('claude-message', (event) => {
      const message = event.payload
      if (message.sessionId === sessionId) {
        session.messages.push(message)
        messageQueue.push(message)
        
        if (resolver) {
          resolver({ value: message, done: false })
          resolver = null
        }
      }
    })

    const unsubscribeError = await listen<ErrorResponse>('claude-error', (_event) => {
      finished = true
      if (resolver) {
        resolver({ value: undefined as any, done: true })
        resolver = null
      }
      unsubscribeMessage()
      unsubscribeError()
    })

    // Store unsubscribe functions
    session.unsubscribe = () => {
      unsubscribeMessage()
      unsubscribeError()
    }

    try {
      // Send the message to backend
      await invoke('send_message', {
        sessionId,
        prompt,
        options
      })

      // Yield user message first
      yield userMessage

      // Create async iterator
      while (!finished || messageQueue.length > 0) {
        if (messageQueue.length > 0) {
          yield messageQueue.shift()!
        } else {
          // Wait for next message
          await new Promise<IteratorResult<Message>>((resolve) => {
            resolver = resolve
          })
        }
      }
    } catch (error: any) {
      throw new ClaudeSDKError(
        error.error || 'Query failed',
        'QUERY_ERROR'
      )
    } finally {
      if (session.unsubscribe) {
        session.unsubscribe()
        session.unsubscribe = undefined
      }
    }
  }

  async abort(sessionId: string): Promise<void> {
    try {
      await invoke('abort_session', { sessionId })
      
      const session = this.sessions.get(sessionId)
      if (session?.unsubscribe) {
        session.unsubscribe()
        session.unsubscribe = undefined
      }
    } catch (error: any) {
      throw new ClaudeSDKError(
        error.error || 'Failed to abort session',
        'ABORT_ERROR'
      )
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

  async clearSession(sessionId: string): Promise<void> {
    try {
      await invoke('clear_session', { sessionId })
      this.sessions.delete(sessionId)
    } catch (error: any) {
      throw new ClaudeSDKError(
        error.error || 'Failed to clear session',
        'CLEAR_ERROR'
      )
    }
  }

  setWorkingDirectory(_sessionId: string, _path: string): void {
    // This will be passed in query options
  }

  registerMCPExtension(_sessionId: string, _extension: MCPExtension): void {
    // This will be passed in query options
  }
}