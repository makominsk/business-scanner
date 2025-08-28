"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = theme === 'system' ? systemTheme : theme
  const isDark = current === 'dark'

  if (!mounted) return null

  return (
    <Button
      variant="outline"
      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
      {isDark ? 'Светлая' : 'Тёмная'}
    </Button>
  )
}

