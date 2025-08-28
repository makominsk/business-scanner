"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface GlassIconProps {
  icon: LucideIcon
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary" | "accent"
}

export function GlassIcon({ icon: Icon, className, size = "md", variant = "primary" }: GlassIconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }

  const variantClasses = {
    primary: "text-purple-400",
    secondary: "text-cyan-400",
    accent: "text-pink-400",
  }

  return (
    <div className="relative">
      <Icon className={cn(sizeClasses[size], variantClasses[variant], "drop-shadow-lg filter", className)} />
      <Icon
        className={cn(sizeClasses[size], variantClasses[variant], "absolute inset-0 blur-sm opacity-50", className)}
      />
    </div>
  )
}
