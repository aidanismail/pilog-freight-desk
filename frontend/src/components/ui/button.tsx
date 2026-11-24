import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-pilog-focus/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-pilog-primary text-white shadow-sm hover:bg-pilog-action",
        outline: "border border-pilog-line bg-white text-pilog-ink shadow-xs hover:border-pilog-control hover:bg-pilog-canvas",
        ghost: "text-pilog-action hover:bg-pilog-notice",
        danger: "text-pilog-danger hover:bg-pilog-error"
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-2.5",
        lg: "h-10 px-5",
        icon: "size-8"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
