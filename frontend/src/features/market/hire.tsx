import type { Case } from '../../api/client';
import { Input, type Edit } from '../voyage/inputs';

const PROFILE: [string, string][] = [
  ['dwt_mt', 'DWT · MT'], ['summer_draft_m', 'Summer draft · m'], ['grain_m3', 'Kapasitas palka · m³'],
  ['tpc_mt_cm', 'TPC · MT/cm'], ['speed_knots', 'Kecepatan laden · knot'], ['sea_vlsfo_mt_day', 'VLSFO laut · MT/hari'],
  ['sea_lsmgo_mt_day', 'LSMGO laut · MT/hari'], ['port_vlsfo_mt_day', 'VLSFO port · MT/hari'],
  ['port_lsmgo_mt_day', 'LSMGO port · MT/hari'], ['bunkers_allowance_mt', 'Allowance bunker · MT'],
  ['constants_allowance_mt', 'Allowance constants · MT'],
];

export function Hire({ caseData, get, edit, edits }: {
  caseData: Case; get: (path: string) => unknown; edit: Edit; edits: Record<string, unknown>;
}) {
  const field = (path: string, label: string) => <Input key={path} label={label} type="number" value={get(path)} change={v => edit(path, v || null)} />;
  const sourceDescription = (path: string) => {
    const source = caseData.sources[path];
    if (path in edits || source?.status === 'manual_override') return 'Input manual / quotation';
    if (source?.benchmark_code) return `FIS · ${source.benchmark_code} · Historis ${source.observed_on}`;
    return source?.status === 'historical_replay' ? 'Nilai dari paket historis' : 'Nilai awal untuk estimasi';
  };
  const families = Object.keys(caseData.profiles);
  return <section className="card"><h2>Kapal dan hire/day</h2>
    {'hire_usd_day' in caseData.profiles.Handysize ? <div className="grid two">{families.map(name => {
      const path = `profiles.${name}.hire_usd_day`;
      return <div key={name}>{field(path, `${name} · USD/hari`)}<small>{sourceDescription(path)}</small></div>;
    })}</div> : field('hire_usd_day', 'Hire/day kedua kelas · USD/hari')}
    <details><summary>Spesifikasi kapal dan konsumsi</summary><div className="grid two">
      {families.map(name => <div key={name}><h3>{name}</h3><div className="grid two">
        {PROFILE.map(([key, label]) => field(`profiles.${name}.${key}`, label))}
      </div></div>)}
    </div></details>
  </section>;
}
