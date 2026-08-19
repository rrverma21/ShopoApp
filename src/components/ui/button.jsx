import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:text-disabled-text disabled:bg-border-secondary",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-heading hover:bg-primary-hover shadow-md",
        destructive:
          "bg-error text-heading hover:bg-error/90",
        outline:
          "border border-border bg-transparent text-text hover:bg-dropdown-hover-bg hover:text-heading hover:border-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "bg-transparent text-secondary-text hover:bg-dropdown-hover-bg hover:text-heading",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-heading hover:bg-success/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }