'use client'

import { Square, Trash2, RotateCcw, Send, Loader2, FolderOpen, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { GitBranchSelector } from '@/components/git-branch-selector'
import { CodeOutput, type CodeOutput as CodeOutputType } from '@/components/code-output'
import { useAgentStore } from '@/lib/store/agent-store'
import { useAgentRuntime } from '@/hooks/use-agent-runtime'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function AgentWorkspace() {
  const { activeAgentId, getAgent, updateAgent, removeAgent } = useAgentStore()
  const [input, setInput] = useState('')
  const [workingDir, setWorkingDir] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
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
  
  // Extract code outputs from messages
  const codeOutputs: CodeOutputType[] = messages
    .filter(msg => msg.role === 'system' && 
      (msg.content.includes('✏️ Writing file:') || msg.content.includes('✏️ Editing file:')))
    .map((msg, index): CodeOutputType => {
      const match = msg.content.match(/(?:Writing|Editing) file: (.+)/)
      const filename = match?.[1] || `output-${index}.txt`
      return {
        filename,
        content: 'File content would be shown here once we track actual file changes',
        language: filename.endsWith('.ts') ? 'typescript' : 
                  filename.endsWith('.tsx') ? 'typescript' :
                  filename.endsWith('.js') ? 'javascript' :
                  filename.endsWith('.py') ? 'python' :
                  filename.endsWith('.rs') ? 'rust' : undefined
      }
    })

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Set initial working directory when agent changes
  useEffect(() => {
    if (activeAgent?.workingDirectory) {
      setWorkingDir(activeAgent.workingDirectory)
    }
  }, [activeAgent])

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

  const handleBrowseDirectory = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Working Directory'
      })
      
      if (selected && typeof selected === 'string') {
        setWorkingDir(selected)
        setWorkingDirectory(selected)
        if (activeAgentId) {
          updateAgent(activeAgentId, { workingDirectory: selected })
        }
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error)
    }
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
          {(activeAgent.status === 'running' || isLoading) && (
            <Button variant="destructive" onClick={handleStop}>
              <Square className="mr-2 h-4 w-4" />
              Stop
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

      <Tabs defaultValue="conversation" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 flex-shrink-0">
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Conversation</CardTitle>
                  <CardDescription>
                    Chat with your agent and see the conversation history
                  </CardDescription>
                </div>
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const conversationText = messages
                        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
                        .join('\n\n')
                      navigator.clipboard.writeText(conversationText)
                      setCopiedAll(true)
                      setTimeout(() => setCopiedAll(false), 2000)
                      toast.success('Conversation copied to clipboard')
                    }}
                  >
                    {copiedAll ? (
                      <>
                        <Check className="h-3 w-3 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-2" />
                        Copy All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              <div className="flex-1 overflow-y-auto px-6" ref={scrollAreaRef}>
                  <div className="space-y-4 py-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground">
                        No messages yet. Start a conversation with your agent.
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            'flex group',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'relative max-w-[80%] rounded-lg px-4 py-2',
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.role === 'assistant'
                                ? 'bg-muted'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium">
                                {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                                  message.role === 'user' 
                                    ? "text-primary-foreground hover:bg-primary-foreground/20" 
                                    : message.role === 'assistant'
                                    ? "hover:bg-accent"
                                    : "hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                )}
                                onClick={() => {
                                  navigator.clipboard.writeText(message.content)
                                  setCopiedIndex(index)
                                  setTimeout(() => setCopiedIndex(null), 2000)
                                }}
                              >
                                {copiedIndex === index ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
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
              </div>
              <div className="flex-shrink-0 flex gap-2 border-t p-6">
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

        <TabsContent value="output" className="flex-1 px-6 pb-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Output</CardTitle>
              <CardDescription>
                View the code and files generated by your agent
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <CodeOutput outputs={codeOutputs} />
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
                  <div className="mt-1 flex gap-2">
                    <Input
                      placeholder="/path/to/project"
                      value={workingDir}
                      onChange={(e) => setWorkingDir(e.target.value)}
                      onBlur={(e) => {
                        setWorkingDirectory(e.target.value)
                        updateAgent(activeAgent.id, { workingDirectory: e.target.value })
                      }}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleBrowseDirectory}
                      title="Browse for directory"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <GitBranchSelector
                  workingDirectory={workingDir || activeAgent.workingDirectory}
                  onBranchChange={(branch) => updateAgent(activeAgent.id, { branch })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}