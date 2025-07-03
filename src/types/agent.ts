export type AgentType = 'task' | 'explorer' | 'builder' | 'review'
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error'

export interface AgentConfig {
  id: string
  name: string
  type: AgentType
  systemPrompt?: string
  workingDirectory?: string
  branch?: string
  model?: string
  maxTokens?: number
  temperature?: number
  maxTurns?: number
  mcpExtensions?: string[]
}

export interface QueryOptions {
  abortController?: AbortController
  allowedTools?: string[]
  disallowedTools?: string[]
  maxThinkingTokens?: number
  maxTurns?: number
  model?: string
  fallbackModel?: string
  cwd?: string
  customSystemPrompt?: string
  appendSystemPrompt?: string
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  continue?: boolean
  resume?: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCall[]
  timestamp: Date
  sessionId?: string
}

export interface ToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
  result?: string
}

export interface ConversationExport {
  agentId: string
  messages: Message[]
  metadata: {
    createdAt: Date
    updatedAt: Date
    totalTurns: number
    totalTokens: number
  }
}

export interface MCPExtension {
  name: string
  type: 'stdio' | 'sse' | 'http'
  config: Record<string, any>
}