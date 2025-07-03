'use client'

import { Play, Square, Trash2, RotateCcw, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useAgentStore } from '@/lib/store/agent-store'
import { useAgentRuntime } from '@/hooks/use-agent-runtime'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function AgentWorkspace() {
  const { activeAgentId, getAgent, updateAgent, removeAgent } = useAgentStore()
  const [input, setInput] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeAgent = activeAgentId ? getAgent(activeAgentId) : null
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    abortQuery,
    clearMessages,
    setWorkingDirectory,
    setSystemPrompt,
  } = useAgentRuntime(activeAgentId)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  if (!activeAgent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-muted-foreground">
            No agent selected
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create or select an agent from the sidebar to get started
          </p>
        </div>
      </div>
    )
  }

  const handleRun = async () => {
    if (!input.trim() || isLoading) return
    
    await sendMessage(input.trim())
    setInput('')
  }

  const handleStop = () => {
    abortQuery()
  }

  const handleDelete = () => {
    if (activeAgentId) {
      removeAgent(activeAgentId)
    }
  }

  const handleReset = () => {
    clearMessages()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold">{activeAgent.name}</h2>
          <p className="text-sm text-muted-foreground">
            {activeAgent.type.charAt(0).toUpperCase() + activeAgent.type.slice(1)} Agent
          </p>
        </div>
        <div className="flex gap-2">
          {activeAgent.status === 'running' || isLoading ? (
            <Button variant="destructive" onClick={handleStop}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button disabled>
              <Play className="mr-2 h-4 w-4" />
              Run
            </Button>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="conversation" className="flex-1">
        <TabsList className="mx-6 mt-4">
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="flex-1 px-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                Chat with your agent and see the conversation history
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-5rem)] flex-col">
              <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground">
                      No messages yet. Start a conversation with your agent.
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-4 py-2',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : message.role === 'assistant'
                              ? 'bg-muted'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                          )}
                        >
                          <div className="text-sm font-medium mb-1">
                            {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {error && (
                    <div className="text-center text-sm text-destructive">
                      Error: {error}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleRun()
                    }
                  }}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleRun} 
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output" className="flex-1 px-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Output</CardTitle>
              <CardDescription>
                View the code and files generated by your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-muted-foreground">
                No output yet. Run your agent to see results.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="flex-1 px-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Context</CardTitle>
              <CardDescription>
                Manage the files and information available to your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-muted-foreground">
                No context configured. Add files or documentation for your agent.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="flex-1 px-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Customize your agent&apos;s behavior and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">System Prompt</label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    rows={4}
                    placeholder="Enter a system prompt for your agent..."
                    defaultValue={activeAgent.systemPrompt || ''}
                    onBlur={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Working Directory</label>
                  <Input
                    placeholder="/path/to/project"
                    defaultValue={activeAgent.workingDirectory || ''}
                    onBlur={(e) => setWorkingDirectory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Git Branch</label>
                  <Input
                    placeholder="main"
                    defaultValue={activeAgent.branch || ''}
                    onBlur={(e) => updateAgent(activeAgent.id, { branch: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}