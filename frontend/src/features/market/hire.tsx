import type { Case } from "../../api/client";
import { Input } from "../../components/fields";
import type { Edit } from "../voyage/inputs";

const PROFILE: [string, string][] = [
  ["dwt_mt", "DWT (MT)"],
  ["summer_draft_m", "Summer draft (m)"],
  ["grain_m3", "Kapasitas palka (m³)"],
  ["tpc_mt_cm", "TPC (MT/cm)"],
  ["speed_knots", "Kecepatan laden (knot)"],
  ["sea_vlsfo_mt_day", "VLSFO saat berlayar (MT/hari)"],
  ["sea_lsmgo_mt_day", "LSMGO saat berlayar (MT/hari)"],
  ["port_vlsfo_mt_day", "VLSFO di pelabuhan (MT/hari)"],
  ["port_lsmgo_mt_day", "LSMGO di pelabuhan (MT/hari)"],
  ["bunkers_allowance_mt", "Alokasi berat bunker (MT)"],
  ["constants_allowance_mt", "Alokasi berat constants kapal (MT)"]
];

export function Hire({
  caseData,
  get,
  edit,
  edits
}: {
  caseData: Case;
  get: (path: string) => unknown;
  edit: Edit;
  edits: Record<string, unknown>;
}) {
  const field = (path: string, label: string) => (
    <Input
      key={path}
      label={label}
      type="number"
      value={get(path)}
      change={(v) => edit(path, v || null)}
    />
  );
  const sourceDescription = (path: string) => {
    const source = caseData.sources[path];
    if (path in edits || source?.status === "manual_override")
      return "Tarif diisi manual";
    if (source?.benchmark_code)
      return `FIS · ${source.benchmark_code} · Historis ${source.observed_on}`;
    return source?.status === "historical_replay"
      ? "Nilai dari paket historis"
      : "Nilai awal untuk estimasi";
  };
  const families = Object.keys(caseData.profiles);
  return (
    <section className="workspace-section">
      <h2 className="font-black">Kapal dan Tarif Sewa</h2>
      {"hire_usd_day" in caseData.profiles.Handysize ? (
        <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
          {families.map((name) => {
            const path = `profiles.${name}.hire_usd_day`;
            return (
              <div className="space-y-1.5" key={name}>
                {field(path, `${name} (USD/hari)`)}
                <small className="block">{sourceDescription(path)}</small>
              </div>
            );
          })}
        </div>
      ) : (
        field("hire_usd_day", "Tarif sewa kedua kelas (USD/hari)")
      )}
      <details>
        <summary>Spesifikasi dan konsumsi bahan bakar</summary>
        <div className="grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
          {families.map((name) => (
            <div
              key={name}
              className="rounded-lg border border-pilog-line bg-pilog-canvas/45 p-3.5 sm:p-4"
            >
              <h3>{name}</h3>
              <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2 [&>*]:min-w-0">
                {PROFILE.map(([key, label]) =>
                  field(`profiles.${name}.${key}`, label)
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
