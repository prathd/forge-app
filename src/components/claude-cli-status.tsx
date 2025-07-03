'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
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
      const cliStatus = await sdk.getClaudeCliStatus()
      setStatus(cliStatus)
    } catch {
      setStatus({
        installed: false,
        authenticated: false,
        error: 'Failed to check Claude CLI status'
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

  // Installed but not authenticated
  if (!status.authenticated) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-50/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertTitle>Claude CLI Not Authenticated</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {status.error || 'Claude CLI is installed but not authenticated. Please authenticate to use Forge.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Run <code className="bg-muted px-1 rounded">claude auth</code> in your terminal to authenticate.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://docs.anthropic.com/claude-code/quickstart#authenticate', '_blank')}
            >
              Authentication Guide
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