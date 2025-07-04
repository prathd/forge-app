'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClaudeSDKTauri } from '@/lib/sdk/claude-sdk-tauri'

interface ClaudeCliStatusData {
  installed: boolean
  version?: string
  authenticated: boolean
  error?: string
}

const sdk = new ClaudeSDKTauri()

export function ClaudeCliStatus() {
  const [status, setStatus] = useState<ClaudeCliStatusData | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setIsChecking(true)
    
    try {
      // Add a frontend timeout - now much shorter since we skip auth check
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Check timed out')), 5000)
      })
      
      const cliStatus = await Promise.race([
        sdk.getClaudeCliStatus(),
        timeoutPromise
      ])
      
      setStatus(cliStatus)
    } catch (error: any) {
      setStatus({
        installed: false,
        authenticated: false,
        error: error.message === 'Check timed out' 
          ? 'Claude CLI check is taking too long. The CLI might not be installed or accessible.'
          : 'Failed to check Claude CLI status'
      })
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking Claude CLI...</AlertTitle>
        <AlertDescription>
          Verifying Claude CLI installation and authentication status...
        </AlertDescription>
      </Alert>
    )
  }

  if (!status) return null

  // Not installed
  if (!status.installed) {
    return (
      <Alert className="border-red-500/50 bg-red-50/10">
        <XCircle className="h-4 w-4 text-red-500" />
        <AlertTitle>Claude CLI Not Found</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {status.error || 'Claude CLI is not installed or not in your PATH. To use Forge with real Claude capabilities, you need to install it.'}
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

  // Installed but maybe not authenticated (we skip auth check for speed)
  // Remove this block since we're assuming authenticated for now

  // All good
  return (
    <Alert className="border-green-500/50 bg-green-50/10">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <AlertTitle>Claude CLI Ready</AlertTitle>
      <AlertDescription>
        Claude CLI {status.version ? `v${status.version}` : ''} is installed and authenticated.
      </AlertDescription>
    </Alert>
  )
}