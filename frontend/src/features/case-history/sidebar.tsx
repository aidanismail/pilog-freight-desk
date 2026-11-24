import { ChevronDown, Download, History, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { fmt } from "../../lib/number-format";
import { cn } from "../../lib/utils";
import type { HistoryEntry } from "./storage";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function CaseHistory({
  entries,
  active,
  disabled,
  commodities,
  onOpen,
  onDownload,
  onRemove
}: {
  entries: HistoryEntry[];
  active?: string;
  disabled: boolean;
  commodities?: Record<string, string>;
  onOpen: (entry: HistoryEntry) => void;
  onDownload: (entry: HistoryEntry) => void;
  onRemove: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      aria-label="Riwayat kasus"
      className="min-w-0 self-start lg:sticky lg:top-5"
    >
      <div className="overflow-hidden rounded-xl border border-pilog-line bg-white shadow-xs">
        <h2 className="mb-0 hidden items-center gap-2 border-b border-pilog-line px-4 py-3.5 text-sm lg:flex">
          <History aria-hidden className="size-4" /> Riwayat kasus
        </h2>
        <Button
          variant="ghost"
          className="w-full justify-start rounded-none px-4 lg:hidden"
          aria-expanded={expanded}
          aria-controls="case-history-list"
          onClick={() => setExpanded(!expanded)}
        >
          <History aria-hidden /> Riwayat kasus
          <span className="text-xs text-pilog-muted">{entries.length}</span>
          <ChevronDown
            aria-hidden
            className={cn("ml-auto", expanded && "rotate-180")}
          />
        </Button>
        <div
          id="case-history-list"
          className={cn(
            "max-h-[min(55vh,32rem)] overflow-y-auto p-2 lg:block lg:max-h-[calc(100dvh-6rem)]",
            !expanded && "hidden"
          )}
        >
          {entries.length === 0 ? (
            <p className="px-2 py-2 text-sm text-pilog-muted">
              Hasil perhitungan freight akan muncul di sini.
            </p>
          ) : (
            <ul className="grid gap-1">
              {entries.map((entry) => {
                const { ports, commodity, cargo_mt } = entry.evaluation.case;
                const route = `${ports.load.name} → ${ports.discharge.name}`;
                const date = dateFormat.format(new Date(entry.savedAt));
                const product =
                  typeof commodity === "string"
                    ? commodities?.[commodity]
                    : undefined;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      "rounded-lg border px-2 py-1",
                      active === entry.id
                        ? "border-pilog-line bg-pilog-notice"
                        : "border-transparent hover:bg-pilog-canvas"
                    )}
                  >
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-sm px-1 py-1.5 text-left disabled:opacity-50"
                      aria-label={`Buka kasus ${route} · ${date}`}
                      aria-current={active === entry.id ? "true" : undefined}
                      disabled={disabled}
                      onClick={() => {
                        setExpanded(false);
                        onOpen(entry);
                      }}
                    >
                      <span className="block wrap-anywhere text-sm font-semibold">
                        {route}
                      </span>
                      <span className="block wrap-anywhere text-xs text-pilog-muted">
                        {product ? `${product} · ` : ""}
                        {fmt(cargo_mt)} MT
                      </span>
                      <time
                        dateTime={entry.savedAt}
                        className="text-xs text-pilog-muted"
                      >
                        {date}
                      </time>
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5 pl-1">
                      <div className="ml-auto flex">
                        <Button
                          className="hover:bg-pilog-control"
                          size="icon"
                          variant="ghost"
                          aria-label={`Download kasus ${route}`}
                          title="Download kasus"
                          disabled={disabled}
                          onClick={() => onDownload(entry)}
                        >
                          <Download aria-hidden />
                        </Button>
                        <Button
                          size="icon"
                          variant="danger"
                          aria-label={`Hapus riwayat ${route}`}
                          title="Hapus dari riwayat"
                          disabled={disabled}
                          onClick={() => onRemove(entry)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
