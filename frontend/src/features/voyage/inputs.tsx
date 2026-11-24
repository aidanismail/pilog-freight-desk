import type { Case, Catalog, Fields, Port } from '../../api/client';
import { Calendar } from './calendar';

export type Edit = (path: string, value: unknown) => void;
export const fmt = (value: unknown) => value == null || value === '' ? '—'
  : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));

export function Input({ label, value, change, type = 'text' }: {
  label: string; value: unknown; change: (value: string) => void; type?: string;
}) {
  return <label>{label}<input aria-label={label} type={type} step="any" value={typeof value === 'string' || typeof value === 'number' ? value : ''}
    onChange={event => change(event.target.value)} /></label>;
}

export function Select({ label, options, value, change }: {
  label: string; options: Record<string, string>; value: string; change: (value: string) => void;
}) {
  return <label>{label}<select aria-label={label} value={value} onChange={event => change(event.target.value)}>
    {Object.entries(options).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select></label>;
}

export const portKey = (port: Port) => JSON.stringify(port);
export const portOptions = (entries: Port[]) => Object.fromEntries(entries.map(port => [portKey(port), port.join(', ')]));
export const casePort = (caseData: Case, side: 'load' | 'discharge'): Port => [caseData.ports[side].name, caseData.ports[side].country];

export function Voyage({ caseData, catalog, get, edit, changePort }: {
  caseData: Case; catalog: Catalog; get: (path: string) => unknown; edit: Edit;
  changePort: (side: 'load' | 'discharge', newPort: Port) => void;
}) {
  const field = (path: string, title: string, type = 'number') => <Input key={path} label={title} value={get(path)} type={type}
    change={value => edit(path, value === '' ? null : value)} />;
  const options = portOptions(catalog.ports);
  for (const side of ['load', 'discharge'] as const) options[portKey(casePort(caseData, side))] = casePort(caseData, side).join(', ');
  const terms = Object.fromEntries(Object.entries(catalog.terms).map(([key, term]) => [key, term.label ?? key]));
  return <>
    <section className="card">
      <h2>Pengiriman</h2>
      <div className="grid two">
        {(['load', 'discharge'] as const).map(side => <Select key={side} label={side === 'load' ? 'Pelabuhan muat' : 'Pelabuhan bongkar'}
          options={options} value={portKey(casePort(caseData, side))} change={value => changePort(side, JSON.parse(value) as Port)} />)}
      </div>
      <div className="grid">
        <Select label="Komoditas" options={catalog.commodities} value={String(get('commodity'))} change={value => edit('commodity', value)} />
        {field('cargo_mt', 'Muatan nominal · MT')}{field('distance_nm', 'Jarak laut · NM')}
        {field('stowage_factor_m3_mt', 'Stowage factor · m³/MT')}{field('tolerance_percent', 'Toleransi muatan · %')}
        <Input label="Mulai muat · UTC" type="datetime-local" value={String(get('start_at') ?? '').slice(0, 16)} change={value => edit('start_at', value)} />
        {field('selling_freight_usd_mt', 'Tarif jual freight · USD/MT (opsional)')}
      </div>
      {get('distance_nm') == null && <p className="notice">Jarak belum ditemukan. Isi jarak laut dalam nautical mile.</p>}
    </section>
    <section className="card"><h2>Operasi pelabuhan</h2><div className="grid two">
      {(['load', 'discharge'] as const).map(side => {
        const path = `ports.${side}`;
        const calendar = get(`${path}.calendar`) as Fields;
        return <div key={side}><h3>{side === 'load' ? 'Muat' : 'Bongkar'}</h3>
          <div className="grid two">
            {field(`${path}.rate_mt_day`, 'Laju · MT/hari')}{field(`${path}.port_da_usd`, 'Port DA · USD')}
            <Select label="Terms" options={terms} value={String(get(`${path}.terms`))} change={value => edit(`${path}.terms`, value)} />
            <Select label="Basis waktu" options={{ factor: 'Faktor terms', calendar: 'Kalender operasi' }} value={String(get(`${path}.time_basis`))}
              change={value => edit(`${path}.time_basis`, value)} />
            {field(`${path}.time_margin_percent`, 'Margin waktu · %')}{field(`${path}.draft_limit_m`, 'Batas draft · m')}
            {field(`${path}.waiting_days`, 'Hari tunggu')}{field(`${path}.allowance_days`, 'Hari tambahan')}
            {get(`${path}.time_basis`) === 'calendar' && <Calendar value={calendar} defaults={catalog.work_windows[String(get(`${path}.terms`))]}
              change={value => edit(`${path}.calendar`, value)} />}
          </div></div>;
      })}
    </div></section>
    <section className="card"><h2>Bunker dan biaya tambahan</h2><div className="grid">
      {field('fuel.VLSFO.value', 'VLSFO · USD/MT')}{field('fuel.LSMGO.value', 'LSMGO · USD/MT')}{field('bunker_delay_days', 'Bunker delay · hari')}
    </div><details><summary>Biaya tambahan</summary>
      {((get('other_costs') ?? []) as Fields[]).map((line, index, rows) => <div className="grid three" key={index}>
        <Input label="Biaya" value={line.label} change={label => edit('other_costs', rows.map((row, i) => i === index ? { ...row, label } : row))} />
        <Input label="USD" type="number" value={line.amount} change={amount => edit('other_costs', rows.map((row, i) => i === index ? { ...row, amount } : row))} />
        <button type="button" onClick={() => edit('other_costs', rows.filter((_, i) => i !== index))}>Hapus</button>
      </div>)}
      <button type="button" onClick={() => edit('other_costs', [...((get('other_costs') ?? []) as Fields[]),
        { id: crypto.randomUUID(), unit: 'USD', label: 'Biaya lain', amount: '0' }])}>Tambah biaya</button>
    </details></section>
  </>;
}
