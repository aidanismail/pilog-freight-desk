import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";

export const Command = CommandPrimitive;
export const CommandEmpty = CommandPrimitive.Empty;

export function CommandInput(props: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2 border-b border-pilog-line px-3">
      <Search aria-hidden className="size-4 shrink-0 text-pilog-muted" />
      <CommandPrimitive.Input className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-pilog-muted" {...props} />
    </div>
  );
}

export function CommandList(props: ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className="max-h-[min(16rem,max(5rem,calc(var(--radix-popover-content-available-height)-2.75rem)))] overflow-y-auto p-1 text-sm" {...props} />;
}

export function CommandItem(props: ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item className="flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 data-[selected=true]:bg-pilog-notice data-[selected=true]:text-pilog-action" {...props} />;
}
