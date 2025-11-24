import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Alert component for displaying important messages with different variants.
 *
 * Inline code elements (`<code>`) within alerts are automatically styled with:
 * - Monospace font (JetBrains Mono)
 * - Rounded background with padding
 * - Dark/light mode appropriate colors:
 *   - Default: Gray background (light) / dark gray (dark)
 *   - Destructive: Red background (light) / dark red (dark)
 *   - Warning: Yellow background (light) / dark yellow (dark)
 */

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground [&_code]:bg-gray-100 [&_code]:text-gray-800 dark:[&_code]:bg-gray-800 dark:[&_code]:text-gray-200',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive [&_code]:bg-red-100 [&_code]:text-red-800 dark:[&_code]:bg-red-900/30 dark:[&_code]:text-red-200',
        warning:
          'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 [&>svg]:text-yellow-600 [&_code]:bg-yellow-100 [&_code]:text-yellow-800 dark:[&_code]:bg-yellow-800/30 dark:[&_code]:text-yellow-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={alertVariants({ variant, className })}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className || ''}`}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className || ''}`}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };