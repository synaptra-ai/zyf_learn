import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        owned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        reading: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        finished: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        wishlist: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      },
    },
    defaultVariants: {
      variant: 'owned',
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
