import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error'

export interface Agent {
  id: string
  name: string
  type: 'task' | 'explorer' | 'builder' | 'review'
  status: AgentStatus
  createdAt: Date
  updatedAt: Date
  systemPrompt?: string
  workingDirectory?: string
  branch?: string
}

interface AgentStore {
  agents: Agent[]
  activeAgentId: string | null
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  setActiveAgent: (id: string | null) => void
  getAgent: (id: string) => Agent | undefined
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      agents: [],
      activeAgentId: null,

      addAgent: (agentData) => {
        const newAgent: Agent = {
          ...agentData,
          id: crypto.randomUUID(),
          status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({ agents: [...state.agents, newAgent] }))
      },

      updateAgent: (id, updates) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id
              ? { ...agent, ...updates, updatedAt: new Date() }
              : agent
          ),
        }))
      },

      removeAgent: (id) => {
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          activeAgentId: state.activeAgentId === id ? null : state.activeAgentId,
        }))
      },

      setActiveAgent: (id) => {
        set({ activeAgentId: id })
      },

      getAgent: (id) => {
        return get().agents.find((agent) => agent.id === id)
      },
    }),
    {
      name: 'forge-agent-store',
    }
  )
)