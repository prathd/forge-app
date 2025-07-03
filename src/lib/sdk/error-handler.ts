import { ClaudeSDKError } from './claude-sdk'

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  onRetry: () => {},
}

export class ErrorHandler {
  static isRetryableError(error: Error): boolean {
    // Network errors
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true
    }

    // Rate limit errors
    if (error instanceof ClaudeSDKError) {
      if (error.code === 'RATE_LIMIT' || 
          error.code === 'OVERLOADED' ||
          error.code === 'SERVICE_UNAVAILABLE') {
        return true
      }
    }

    // Don't retry on these errors
    if (error instanceof ClaudeSDKError) {
      if (error.code === 'ABORTED' ||
          error.code === 'INVALID_API_KEY' ||
          error.code === 'PERMISSION_DENIED') {
        return false
      }
    }

    return false
  }

  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
    let lastError: Error | null = null
    let delay = opts.initialDelay

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (!this.isRetryableError(lastError) || attempt === opts.maxAttempts) {
          throw lastError
        }

        opts.onRetry(attempt, lastError)

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))

        // Exponential backoff
        delay = Math.min(delay * opts.backoffFactor, opts.maxDelay)
      }
    }

    throw lastError!
  }

  static formatError(error: Error): string {
    if (error instanceof ClaudeSDKError) {
      switch (error.code) {
        case 'SESSION_NOT_FOUND':
          return 'Session expired. Please restart the agent.'
        case 'AGENT_NOT_FOUND':
          return 'Agent not found. It may have been deleted.'
        case 'RATE_LIMIT':
          return 'Rate limit exceeded. Please wait a moment and try again.'
        case 'INVALID_API_KEY':
          return 'Invalid API key. Please check your Claude CLI authentication.'
        case 'PERMISSION_DENIED':
          return 'Permission denied. Please check your Claude CLI permissions.'
        case 'ABORTED':
          return 'Operation cancelled.'
        case 'error_max_turns':
          return 'Maximum conversation turns reached.'
        case 'error_during_execution':
          return 'An error occurred during execution.'
        default:
          return error.message
      }
    }

    // Generic error formatting
    if (error.message.includes('ECONNREFUSED')) {
      return 'Could not connect to Claude CLI. Is it installed and running?'
    }

    if (error.message.includes('ETIMEDOUT')) {
      return 'Connection timed out. Please check your internet connection.'
    }

    return error.message || 'An unknown error occurred'
  }

  static async handleStreamError(
    error: Error,
    onError: (formattedError: string) => void
  ): Promise<void> {
    const formattedError = this.formatError(error)
    onError(formattedError)

    // Log to console for debugging
    console.error('Stream error:', error)
  }
}