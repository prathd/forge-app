import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export interface GitStatus {
  isRepo: boolean
  currentBranch?: string
  hasUnstagedChanges: boolean
  hasStagedChanges: boolean
  branches: string[]
}

export function useGitStatus(directory: string | undefined) {
  return useQuery<GitStatus>({
    queryKey: ['git-status', directory],
    queryFn: async () => {
      if (!directory) {
        return {
          isRepo: false,
          hasUnstagedChanges: false,
          hasStagedChanges: false,
          branches: []
        }
      }
      
      return await invoke<GitStatus>('check_git_status', { directory })
    },
    enabled: !!directory,
    refetchInterval: 5000, // Refetch every 5 seconds to catch external changes
  })
}