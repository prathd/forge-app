'use client'

import { Settings, Github, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/contexts/theme-context'

export function Header() {
  const { theme, toggleTheme, mounted } = useTheme()

  return (
    <div className="flex h-14 items-center border-b px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">Forge</h1>
        <Badge variant="secondary" className="text-xs">
          v0.1.0
        </Badge>
      </div>
      
      <div className="ml-auto flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          ) : (
            <div className="h-5 w-5" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <Github className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}