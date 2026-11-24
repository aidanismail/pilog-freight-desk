import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ children, className, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn("flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-pilog-line bg-white px-3 text-left text-sm font-normal shadow-xs outline-none transition-[border-color,box-shadow] hover:border-pilog-control focus-visible:border-pilog-focus focus-visible:ring-2 focus-visible:ring-pilog-focus/25 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-pilog-muted [&>span]:truncate", className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild><ChevronDown className="size-4 shrink-0 text-pilog-muted" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={5}
        className="z-50 min-w-(--radix-select-trigger-width) max-w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-pilog-line bg-white shadow-lg"
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-[min(19rem,var(--radix-select-content-available-height))] overflow-y-auto p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className="relative flex min-h-8 cursor-pointer items-center rounded-md py-1.5 pr-8 pl-2.5 text-sm outline-none data-highlighted:bg-pilog-notice data-highlighted:text-pilog-action data-disabled:pointer-events-none data-disabled:opacity-50"
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 text-pilog-primary"><Check className="size-4" /></SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
