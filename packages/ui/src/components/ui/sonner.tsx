"use client"
import {
  IconCircleCheck,
  IconInfoCircle,
  IconAlertCircle,
  IconAlertTriangle,
  IconLoader2,
} from '@tabler/icons-react'
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
export { toast } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <IconCircleCheck className="size-4 text-green-500" />,
        info: <IconInfoCircle className="size-4 text-blue-500" />,
        warning: <IconAlertTriangle className="size-4 text-yellow-500" />,
        error: <IconAlertCircle className="size-4 text-red-500" />,
        loading: <IconLoader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
