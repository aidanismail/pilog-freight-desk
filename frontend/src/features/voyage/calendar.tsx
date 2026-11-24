import type { Fields } from '../../api/client';
import { Input } from './inputs';

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export function Calendar({ value, defaults, change }: {
  value: Fields; defaults: Record<string, number[][]>; change: (item: Fields) => void;
}) {
  const windows = value.windows as Record<string, number[][]> | undefined;
  const setWindow = (day: string, ranges: number[][]) => change({ ...value, windows: { ...windows, [day]: ranges } });
  const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const minute = (text: string) => Number(text.split(':')[0]) * 60 + Number(text.split(':')[1]);
  return <div className="wide"><div className="grid two">
    <Input label="Zona waktu (IANA)" value={value.timezone} change={timezone => change({ ...value, timezone })} />
    <Input label="Hari libur · YYYY-MM-DD, dipisah koma" value={(value.holidays as string[] ?? []).join(',')}
      change={text => change({ ...value, holidays: text.split(',') })} />
    </div>
    <details><summary>Jam kerja mingguan</summary>
      <label className="check"><input type="checkbox" checked={Boolean(windows)} onChange={event => {
        const next = { ...value }; if (event.target.checked) next.windows = defaults; else delete next.windows; change(next);
      }} />Atur jam kerja per hari</label>
      {windows && days.map((label, index) => {
        const day = String(index);
        const ranges = windows[day] ?? [];
        return <div key={day} className="contract"><b>{label}</b>
          {ranges.map(([start, end], index) => <div key={index} className="grid three">
            <Input label="Mulai" type="time" value={clock(start)} change={v => v && setWindow(day, ranges.map((r, i) => i === index ? [minute(v), end] : r))} />
            {end === 1440 ? <button type="button" onClick={() => setWindow(day, ranges.map((r, i) => i === index ? [start, 1439] : r))}>Selesai 24:00</button>
              : <Input label="Selesai" type="time" value={clock(end)} change={v => v && setWindow(day, ranges.map((r, i) => i === index ? [start, minute(v)] : r))} />}
            <button type="button" onClick={() => setWindow(day, ranges.filter((_, i) => i !== index))}>Hapus interval</button>
          </div>)}
          <button type="button" onClick={() => setWindow(day, [...ranges, [480, 1020]])}>Tambah interval · {label}</button>
        </div>;
      })}
    </details>
  </div>;
}
