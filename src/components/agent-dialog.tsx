'use client'

import { useState } from 'react'
import { Bot, Search, Hammer, Eye, FolderOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAgentStore } from '@/lib/store/agent-store'

interface AgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const agentTypes = [
  {
    value: 'task',
    label: 'Task Agent',
    description: 'Single-purpose agent for specific tasks',
    icon: Bot,
  },
  {
    value: 'explorer',
    label: 'Explorer Agent',
    description: 'Analyzes and understands codebases',
    icon: Search,
  },
  {
    value: 'builder',
    label: 'Builder Agent',
    description: 'Long-running agent that scaffolds and builds features',
    icon: Hammer,
  },
  {
    value: 'review',
    label: 'Review Agent',
    description: 'Specialized agent for code review and optimization',
    icon: Eye,
  },
]

export function AgentDialog({ open, onOpenChange }: AgentDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'task' | 'explorer' | 'builder' | 'review'>('task')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [workingDirectory, setWorkingDirectory] = useState('')
  
  const { addAgent } = useAgentStore()

  const handleCreate = () => {
    if (!name.trim()) return
    
    addAgent({
      name: name.trim(),
      type,
      status: 'idle',
      systemPrompt: systemPrompt.trim() || undefined,
      workingDirectory: workingDirectory.trim() || undefined,
    })
    
    // Reset form
    setName('')
    setType('task')
    setSystemPrompt('')
    setWorkingDirectory('')
    onOpenChange(false)
  }

  const handleBrowseDirectory = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Working Directory'
      })
      
      if (selected && typeof selected === 'string') {
        setWorkingDirectory(selected)
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Configure your new AI agent to help with development tasks.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Feature Builder, Bug Fixer"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="type">Agent Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger id="type">
                <SelectValue>
                  {(() => {
                    const selected = agentTypes.find(t => t.value === type)
                    if (selected) {
                      const Icon = selected.icon
                      return (
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{selected.label}</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {agentTypes.map((agentType) => {
                  const Icon = agentType.icon
                  return (
                    <SelectItem key={agentType.value} value={agentType.value}>
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col">
                          <div className="font-medium">{agentType.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {agentType.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="prompt">System Prompt (Optional)</Label>
            <textarea
              id="prompt"
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Provide specific instructions for this agent..."
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="workingDir">Working Directory (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="workingDir"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                placeholder="/path/to/project"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleBrowseDirectory}
                title="Browse for directory"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}