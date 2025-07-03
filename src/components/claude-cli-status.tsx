'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentRuntime } from '@/lib/sdk/agent-runtime'

const runtime = new AgentRuntime()

export function ClaudeCliStatus() {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setStatus('checking')
    try {
      const available = await runtime.checkClaudeAvailable()
      setStatus(available ? 'available' : 'unavailable')
    } catch {
      setStatus('unavailable')
    }
  }

  if (status === 'checking') {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking Claude CLI...</AlertTitle>
        <AlertDescription>
          Verifying Claude CLI installation...
        </AlertDescription>
      </Alert>
    )
  }

  if (status === 'available') {
    return (
      <Alert className="border-green-500/50 bg-green-50/10">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle>Claude CLI Ready</AlertTitle>
        <AlertDescription>
          Claude CLI is installed and ready to use.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-red-500/50 bg-red-50/10">
      <XCircle className="h-4 w-4 text-red-500" />
      <AlertTitle>Claude CLI Not Found</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Claude CLI is not installed or not in your PATH. To use Forge with real Claude capabilities, you need to install it.
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://claude.ai/code', '_blank')}
          >
            Get Claude CLI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://docs.anthropic.com/claude-code/quickstart', '_blank')}
          >
            View Setup Guide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
          >
            Check Again
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}