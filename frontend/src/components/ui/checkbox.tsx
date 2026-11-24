import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

export function Checkbox(props: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-pilog-control bg-white shadow-xs data-[state=checked]:border-pilog-primary data-[state=checked]:bg-pilog-primary data-[state=checked]:text-white disabled:opacity-50"
      {...props}
    >
      <CheckboxPrimitive.Indicator><Check className="size-3.5" /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
