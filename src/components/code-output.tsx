'use client'

import { useState } from 'react'
import { Copy, Check, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export interface CodeOutput {
  filename: string
  content: string
  language?: string
}

interface CodeOutputProps {
  outputs: CodeOutput[]
}

export function CodeOutput({ outputs }: CodeOutputProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (outputs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No output yet. Run your agent to see generated code and files.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {outputs.map((output, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{output.filename}</span>
              {output.language && (
                <span className="text-xs text-muted-foreground">({output.language})</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(output.content, index)}
              className="h-8"
            >
              {copiedIndex === index ? (
                <>
                  <Check className="h-3 w-3 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="overflow-x-auto p-4 bg-muted/50">
              <code className="text-sm">{output.content}</code>
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}