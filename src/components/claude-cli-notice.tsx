import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ClaudeCliNotice() {
  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>Claude CLI Required</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          To use Forge with real Claude capabilities, you need to have Claude CLI installed and authenticated.
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
        </div>
      </AlertDescription>
    </Alert>
  )
}