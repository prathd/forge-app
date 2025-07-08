'use client'

import { useState } from 'react'
import { GitBranch, GitCommit, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { useGitStatus } from '@/hooks/use-git-status'
import { useGitOperations } from '@/hooks/use-git-operations'
import { cn } from '@/lib/utils'

interface GitBranchSelectorProps {
  workingDirectory?: string
  onBranchChange?: (branch: string) => void
}

export function GitBranchSelector({ workingDirectory, onBranchChange }: GitBranchSelectorProps) {
  const { data: gitStatus, isLoading, refetch } = useGitStatus(workingDirectory)
  const { checkoutBranch, createBranch } = useGitOperations(workingDirectory)
  
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false)
  const [showStashDialog, setShowStashDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [checkoutNewBranch, setCheckoutNewBranch] = useState(true)
  const [targetBranch, setTargetBranch] = useState('')
  const [stashChanges, setStashChanges] = useState(true)

  if (!workingDirectory) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a working directory first
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Checking git status...
      </div>
    )
  }

  if (!gitStatus?.isRepo) {
    return (
      <Alert className="py-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Not a git repository
        </AlertDescription>
      </Alert>
    )
  }

  const handleBranchChange = (branch: string) => {
    if (gitStatus.hasUnstagedChanges || gitStatus.hasStagedChanges) {
      setTargetBranch(branch)
      setShowStashDialog(true)
    } else {
      checkoutBranch.mutate({ branch })
      onBranchChange?.(branch)
    }
  }

  const handleConfirmCheckout = () => {
    checkoutBranch.mutate({ 
      branch: targetBranch,
      options: { stashChanges, force: false }
    })
    onBranchChange?.(targetBranch)
    setShowStashDialog(false)
  }

  const handleCreateBranch = () => {
    createBranch.mutate(
      { branchName: newBranchName, checkout: checkoutNewBranch },
      {
        onSuccess: () => {
          setShowNewBranchDialog(false)
          setNewBranchName('')
          if (checkoutNewBranch) {
            onBranchChange?.(newBranchName)
          }
        }
      }
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Git Branch</Label>
          {(gitStatus.hasUnstagedChanges || gitStatus.hasStagedChanges) && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              (uncommitted changes)
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Select
            value={gitStatus.currentBranch || ''}
            onValueChange={handleBranchChange}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {gitStatus.branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowNewBranchDialog(true)}
            title="Create new branch"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant="outline"
            onClick={() => refetch()}
            title="Refresh branches"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Branch Dialog */}
      <Dialog open={showNewBranchDialog} onOpenChange={setShowNewBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Create a new git branch from the current branch
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/new-feature"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="checkout-new"
                checked={checkoutNewBranch}
                onCheckedChange={(checked) => setCheckoutNewBranch(checked as boolean)}
              />
              <Label htmlFor="checkout-new" className="text-sm font-normal">
                Switch to new branch after creation
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBranchDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || createBranch.isPending}
            >
              {createBranch.isPending ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stash Changes Dialog */}
      <Dialog open={showStashDialog} onOpenChange={setShowStashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uncommitted Changes Detected</DialogTitle>
            <DialogDescription>
              You have uncommitted changes in your working directory. 
              How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <GitCommit className="h-4 w-4" />
            <AlertDescription>
              {gitStatus.hasUnstagedChanges && 'Unstaged changes detected. '}
              {gitStatus.hasStagedChanges && 'Staged changes detected.'}
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stash-changes"
              checked={stashChanges}
              onCheckedChange={(checked) => setStashChanges(checked as boolean)}
            />
            <Label htmlFor="stash-changes" className="text-sm font-normal">
              Stash changes before switching branches
            </Label>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStashDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmCheckout}
              disabled={checkoutBranch.isPending}
              variant={stashChanges ? 'default' : 'destructive'}
            >
              {checkoutBranch.isPending 
                ? 'Switching...' 
                : stashChanges 
                  ? 'Stash & Switch' 
                  : 'Switch Anyway'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}