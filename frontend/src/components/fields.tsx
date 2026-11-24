import { Check, ChevronsUpDown, X } from "lucide-react";
import { useId, useState } from "react";
import { fmt } from "../lib/number-format";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Input as TextInput } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select as Menu, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function Input({ label, value, change, type = "text", optional }: {
  label: string;
  value: unknown;
  change: (value: string) => void;
  type?: string;
  optional?: boolean;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const numeric = type === "number";
  const raw = typeof value === "string" || typeof value === "number" ? value : "";
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id}>
        {label}{optional && <span className="font-normal text-pilog-muted"> (opsional)</span>}
      </label>
      <TextInput
        id={id}
        type={numeric && !editing ? "text" : type}
        inputMode={numeric ? "decimal" : undefined}
        step={type === "number" ? "any" : undefined}
        className={numeric ? "tabular-nums" : undefined}
        value={numeric && !editing && raw !== "" ? fmt(raw) : raw}
        onFocus={numeric ? () => setEditing(true) : undefined}
        onBlur={numeric ? () => setEditing(false) : undefined}
        onChange={(event) => change(event.target.value)}
      />
    </div>
  );
}

const emptyOption = "__empty__";

export function Select({ label, options, value, change }: {
  label: string;
  options: Record<string, string>;
  value: string;
  change: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id}>{label}</label>
      <Menu value={value || ("" in options ? emptyOption : "")} onValueChange={(key) => change(key === emptyOption ? "" : key)}>
        <SelectTrigger id={id}><SelectValue placeholder="Pilih opsi" /></SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([key, name]) => <SelectItem key={key} value={key || emptyOption}>{name}</SelectItem>)}
        </SelectContent>
      </Menu>
    </div>
  );
}

type PortSelection = { value: string; change: (value: string) => void } |
  { values: string[]; update: (values: string[]) => void };

export function PortPicker({ label, options, ...selection }: PortSelection & {
  label: string;
  options: Record<string, string>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = "values" in selection ? selection.values : [selection.value];
  const caption = "values" in selection
    ? selected.length === 0 ? "Pilih pelabuhan" : `${selected.length} pelabuhan dipilih`
    : options[selection.value] ?? "Pilih pelabuhan";

  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id}>{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className="h-10 w-full min-w-0 justify-between px-3 text-left font-normal">
            <span className="truncate">{caption}</span>
            <ChevronsUpDown aria-hidden className="text-pilog-muted" />
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label={label} className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)]">
          <Command label={`Cari ${label.toLowerCase()}`}>
            <CommandInput placeholder="Cari pelabuhan atau negara" />
            <CommandList>
              <CommandEmpty className="px-3 py-4 text-center text-pilog-muted">Pelabuhan tidak ditemukan.</CommandEmpty>
              {Object.entries(options).map(([key, name]) => (
                <CommandItem key={key} value={key} keywords={[name]} onSelect={() => {
                  if ("values" in selection) {
                    selection.update(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
                  } else {
                    setOpen(false);
                    if (key !== selection.value) selection.change(key);
                  }
                }}>
                  <span>{name}</span>
                  {selected.includes(key) && <Check className="size-4 shrink-0 text-pilog-primary" aria-label="Dipilih" />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {"values" in selection && selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label} terpilih`}>
          {selected.map((key) => (
            <li key={key} className="flex max-w-full items-center gap-1 rounded-md border border-pilog-line bg-pilog-canvas py-0.5 pr-0.5 pl-2 text-xs">
              <span className="truncate">{options[key] ?? key}</span>
              <Button variant="ghost" size="icon" className="size-6 [&_svg]:size-3" aria-label={`Hapus ${options[key] ?? key}`} onClick={() => selection.update(selected.filter((item) => item !== key))}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
