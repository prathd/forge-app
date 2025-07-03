'use client'

import { AgentWorkspace } from '@/components/agent-workspace'
import { ClaudeCliStatus } from '@/components/claude-cli-status'

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-4">
        <ClaudeCliStatus />
      </div>
      <div className="flex-1">
        <AgentWorkspace />
      </div>
    </div>
  )
}