import { ClaudeSDKTauri, ClaudeSDKError } from './claude-sdk-tauri'
import type { 
  AgentConfig, 
  Message, 
  QueryOptions,
  ConversationExport,
  MCPExtension,
  AgentStatus
} from '@/types/agent'

export interface RunningAgent {
  config: AgentConfig
  sessionId: string
  status: AgentStatus
  startedAt: Date
  messages: Message[]
  abortController: AbortController
}

export class AgentRuntime {
  private sdk: ClaudeSDKTauri
  private agents: Map<string, RunningAgent> = new Map()
  private messageHandlers: Map<string, (message: Message) => void> = new Map()
  private statusHandlers: Map<string, (status: AgentStatus) => void> = new Map()

  constructor() {
    this.sdk = new ClaudeSDKTauri()
  }

  async checkClaudeAvailable(): Promise<boolean> {
    return this.sdk.checkClaudeCliAvailable()
  }

  async createAgent(config: AgentConfig): Promise<string> {
    const sessionId = await this.sdk.createSession(config.id)
    
    const agent: RunningAgent = {
      config,
      sessionId,
      status: 'idle',
      startedAt: new Date(),
      messages: [],
      abortController: new AbortController()
    }
    
    this.agents.set(config.id, agent)
    return config.id
  }

  async destroyAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (agent) {
      // Abort any running operations
      agent.abortController.abort()
      
      // Clear session
      this.sdk.clearSession(agent.sessionId)
      
      // Remove from runtime
      this.agents.delete(agentId)
      this.messageHandlers.delete(agentId)
      this.statusHandlers.delete(agentId)
    }
  }

  async *query(
    agentId: string, 
    prompt: string, 
    options?: QueryOptions
  ): AsyncIterableIterator<Message> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new ClaudeSDKError('Agent not found', 'AGENT_NOT_FOUND')
    }

    // Update agent status
    this.updateAgentStatus(agentId, 'running')

    // Prepare options with agent config
    const queryOptions: QueryOptions = {
      ...options,
      abortController: agent.abortController,
      cwd: agent.config.workingDirectory || options?.cwd,
      customSystemPrompt: agent.config.systemPrompt || options?.customSystemPrompt,
      model: agent.config.model || options?.model,
      maxTurns: agent.config.maxTurns || options?.maxTurns,
    }

    // Create message stream
    async function* messageStream(
      runtime: AgentRuntime
    ): AsyncIterableIterator<Message> {
      try {
        const messages = runtime.sdk.query(agent!.sessionId, prompt, queryOptions)
        
        for await (const message of messages) {
          // Store message
          agent!.messages.push(message)
          
          // Notify handler
          runtime.notifyMessageHandler(agentId, message)
          
          // Yield to consumer
          yield message
        }
        
        // Update status on completion
        runtime.updateAgentStatus(agentId, 'completed')
      } catch (error) {
        // Update status on error
        runtime.updateAgentStatus(agentId, 'error')
        
        if (error instanceof ClaudeSDKError && error.code === 'ABORTED') {
          runtime.updateAgentStatus(agentId, 'idle')
        }
        
        throw error
      }
    }

    yield* messageStream(this)
  }

  abort(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.abortController.abort()
      this.sdk.abort(agent.sessionId)
      this.updateAgentStatus(agentId, 'idle')
    }
  }

  resumeConversation(_agentId: string, _conversationId: string): Promise<void> {
    // This would load a previous conversation
    // For now, it's a placeholder
    return Promise.resolve()
  }

  setWorkingDirectory(agentId: string, path: string): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.config.workingDirectory = path
      this.sdk.setWorkingDirectory(agent.sessionId, path)
    }
  }

  createWorktree(agentId: string, branch: string): string {
    // This would create a git worktree
    // For now, return a mock path
    const worktreePath = `/tmp/forge-worktrees/${agentId}/${branch}`
    this.setWorkingDirectory(agentId, worktreePath)
    return worktreePath
  }

  setSystemPrompt(agentId: string, prompt: string): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.config.systemPrompt = prompt
    }
  }

  registerMCPExtension(agentId: string, extension: MCPExtension): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      this.sdk.registerMCPExtension(agent.sessionId, extension)
    }
  }

  exportConversation(agentId: string): ConversationExport | null {
    const agent = this.agents.get(agentId)
    if (!agent) return null
    
    return this.sdk.exportConversation(agentId, agent.sessionId)
  }

  getAgent(agentId: string): RunningAgent | undefined {
    return this.agents.get(agentId)
  }

  getAllAgents(): RunningAgent[] {
    return Array.from(this.agents.values())
  }

  onMessage(agentId: string, handler: (message: Message) => void): void {
    this.messageHandlers.set(agentId, handler)
  }

  onStatusChange(agentId: string, handler: (status: AgentStatus) => void): void {
    this.statusHandlers.set(agentId, handler)
  }

  private updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.status = status
      this.notifyStatusHandler(agentId, status)
    }
  }

  private notifyMessageHandler(agentId: string, message: Message): void {
    const handler = this.messageHandlers.get(agentId)
    if (handler) {
      handler(message)
    }
  }

  private notifyStatusHandler(agentId: string, status: AgentStatus): void {
    const handler = this.statusHandlers.get(agentId)
    if (handler) {
      handler(status)
    }
  }
}