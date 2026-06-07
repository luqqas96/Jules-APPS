import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "mint" | "peach" | "lavender" | "blue"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-foreground text-background hover:bg-foreground/90": variant === "default",
            "border border-border bg-transparent hover:bg-surface-secondary": variant === "outline",
            "hover:bg-surface-secondary hover:text-foreground": variant === "ghost",
            "bg-pixel-mint text-foreground hover:bg-pixel-mint/80": variant === "mint",
            "bg-pixel-peach text-foreground hover:bg-pixel-peach/80": variant === "peach",
            "bg-pixel-lavender text-foreground hover:bg-pixel-lavender/80": variant === "lavender",
            "bg-pixel-blue text-foreground hover:bg-pixel-blue/80": variant === "blue",

            "h-12 px-6 py-2": size === "default",
            "h-9 px-3": size === "sm",
            "h-14 px-8 text-base": size === "lg",
            "h-12 w-12": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }