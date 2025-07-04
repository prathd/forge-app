import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

export interface GitCheckoutOptions {
  stashChanges: boolean
  force: boolean
}

export function useGitOperations(directory: string | undefined) {
  const queryClient = useQueryClient()

  const checkoutBranch = useMutation({
    mutationFn: async ({ branch, options }: { branch: string; options?: GitCheckoutOptions }) => {
      if (!directory) throw new Error('No directory selected')
      
      await invoke('git_checkout_branch', { 
        directory, 
        branch,
        options
      })
    },
    onSuccess: (_, { branch }) => {
      toast.success(`Checked out branch: ${branch}`)
      queryClient.invalidateQueries({ queryKey: ['git-status', directory] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to checkout branch: ${error.message}`)
    }
  })

  const createBranch = useMutation({
    mutationFn: async ({ branchName, checkout }: { branchName: string; checkout: boolean }) => {
      if (!directory) throw new Error('No directory selected')
      
      await invoke('git_create_branch', { 
        directory, 
        branchName,
        checkout
      })
    },
    onSuccess: (_, { branchName, checkout }) => {
      toast.success(`Created branch: ${branchName}${checkout ? ' and checked out' : ''}`)
      queryClient.invalidateQueries({ queryKey: ['git-status', directory] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to create branch: ${error.message}`)
    }
  })

  const stashChanges = useMutation({
    mutationFn: async (message?: string) => {
      if (!directory) throw new Error('No directory selected')
      
      await invoke('git_stash_changes', { 
        directory, 
        message
      })
    },
    onSuccess: () => {
      toast.success('Changes stashed successfully')
      queryClient.invalidateQueries({ queryKey: ['git-status', directory] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to stash changes: ${error.message}`)
    }
  })

  return {
    checkoutBranch,
    createBranch,
    stashChanges
  }
}