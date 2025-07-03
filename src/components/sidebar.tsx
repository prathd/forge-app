'use client'

import { Plus, Bot, Search, Hammer, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/lib/store/agent-store'
import { AgentDialog } from '@/components/agent-dialog'
import { useState } from 'react'

const agentTypeIcons = {
  task: Bot,
  explorer: Search,
  builder: Hammer,
  review: Eye,
}

const agentTypeColors = {
  task: 'bg-blue-500/10 text-blue-500',
  explorer: 'bg-purple-500/10 text-purple-500',
  builder: 'bg-green-500/10 text-green-500',
  review: 'bg-orange-500/10 text-orange-500',
}

export function Sidebar() {
  const { agents, activeAgentId, setActiveAgent } = useAgentStore()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="flex h-full w-64 flex-col border-r bg-muted/10">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">Agents</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {agents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No agents yet. Create your first agent to get started.
            </div>
          ) : (
            agents.map((agent) => {
              const Icon = agentTypeIcons[agent.type]
              const isActive = agent.id === activeAgentId
              
              return (
                <Button
                  key={agent.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2',
                    isActive && 'bg-secondary'
                  )}
                  onClick={() => setActiveAgent(agent.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left truncate">{agent.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-auto',
                      agentTypeColors[agent.type]
                    )}
                  >
                    {agent.status}
                  </Badge>
                </Button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
    <AgentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}