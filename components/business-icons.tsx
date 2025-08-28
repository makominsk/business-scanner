"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface BusinessIconProps {
  icon: LucideIcon
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary" | "accent"
  className?: string
}

export function BusinessIcon({ icon: Icon, size = "md", variant = "primary", className }: BusinessIconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  }

  const variantClasses = {
    primary: "text-primary icon-business-glow",
    secondary: "text-secondary icon-business-glow",
    accent: "text-accent icon-business-glow",
  }

  return (
    <Icon
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        "transition-all duration-300 hover:scale-110",
        className,
      )}
    />
  )
}
