import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-pilog-line bg-white px-3 text-sm font-normal shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-pilog-muted/75 hover:border-pilog-control focus-visible:border-pilog-focus focus-visible:ring-2 focus-visible:ring-pilog-focus/25 disabled:cursor-not-allowed disabled:opacity-50",
        type === "number" && "tabular-nums",
        className
      )}
      {...props}
    />
  );
}
