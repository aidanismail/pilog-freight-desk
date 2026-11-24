import { Plus, Trash2 } from "lucide-react";
import type { Fields } from "../../api/client";
import { Input } from "../../components/fields";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";

const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const minute = (text: string) => {
  const [hour, minutes] = text.split(":").map(Number);
  return hour * 60 + minutes;
};

export function Calendar({ value, defaults, change }: {
  value: Fields;
  defaults: Record<string, number[][]>;
  change: (item: Fields) => void;
}) {
  const windows = value.windows as Record<string, number[][]> | undefined;
  const setWindow = (day: string, ranges: number[][]) =>
    change({ ...value, windows: { ...windows, [day]: ranges } });

  return (
    <div className="col-span-full">
      <div className="grid gap-3.5 min-[420px]:grid-cols-2">
        <Input label="Zona waktu (IANA)" value={value.timezone} change={(timezone) => change({ ...value, timezone })} />
        <Input label="Hari libur (YYYY-MM-DD, pisahkan dengan koma)" value={(value.holidays as string[] ?? []).join(",")}
          change={(text) => change({ ...value, holidays: text.split(",") })} />
      </div>
      <details>
        <summary>Jam kerja mingguan</summary>
        <label className="my-3 flex items-center gap-2">
          <Checkbox aria-label="Atur jam kerja per hari" checked={Boolean(windows)} onCheckedChange={(checked) => {
            const next = { ...value };
            if (checked) next.windows = defaults;
            else delete next.windows;
            change(next);
          }} />
          Atur jam kerja per hari
        </label>
        {windows && <div className="space-y-3">
          {days.map((name, dayIndex) => {
            const day = String(dayIndex);
            const ranges = windows[day] ?? [];
            return (
              <div key={day} className="space-y-2 rounded-lg border border-pilog-line bg-white p-3">
                <p className="font-medium">{name}</p>
                {ranges.map(([start, end], index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                    <Input label="Mulai" type="time" value={clock(start)} change={(v) => {
                      if (v) setWindow(day, ranges.map((range, i) => i === index ? [minute(v), end] : range));
                    }} />
                    {end === 1440 ? (
                      <div className="grid gap-1.5">
                        <span className="text-sm font-medium">Selesai</span>
                        <Button variant="outline" className="h-10 font-normal" aria-label="Ubah waktu selesai pukul 24:00"
                          onClick={() => setWindow(day, ranges.map((range, i) => i === index ? [start, 1439] : range))}>
                          24:00
                        </Button>
                      </div>
                    ) : (
                      <Input label="Selesai" type="time" value={clock(end)} change={(v) => {
                        if (v) setWindow(day, ranges.map((range, i) => i === index ? [start, minute(v)] : range));
                      }} />
                    )}
                    <Button variant="danger" size="icon" className="mb-1" aria-label={`Hapus interval ${name} ${index + 1}`}
                      title="Hapus interval" onClick={() => setWindow(day, ranges.filter((_, i) => i !== index))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" aria-label={`Tambah interval ${name}`} onClick={() => setWindow(day, [...ranges, [480, 1020]])}>
                  <Plus aria-hidden /> Tambah interval
                </Button>
              </div>
            );
          })}
        </div>}
      </details>
    </div>
  );
}
