import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        critical: 'border-transparent bg-red-500/10 text-red-600 border-red-200',
        high: 'border-transparent bg-orange-500/10 text-orange-600 border-orange-200',
        medium: 'border-transparent bg-yellow-500/10 text-yellow-600 border-yellow-200',
        low: 'border-transparent bg-blue-500/10 text-blue-600 border-blue-200',
        info: 'border-transparent bg-slate-500/10 text-slate-600 border-slate-200',
        success: 'border-transparent bg-green-500/10 text-green-600 border-green-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
