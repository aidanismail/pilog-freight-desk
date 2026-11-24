import { useEffect, useState } from 'react';
import { download, request, type Case, type Catalog, type Fields, type Port, type Row } from '../../api/client';
import { casePort, fmt, Input, portKey, Select } from '../voyage/inputs';

type Cell = { origin: Port; destination: Port; rate?: string; delta?: string; error?: string; scenario?: Row };

export function SpreadMatrix({ caseData, catalog }: { caseData: Case; catalog: Catalog }) {
  const [origins, setOrigins] = useState([portKey(casePort(caseData, 'load'))]);
  const [destinations, setDestinations] = useState([portKey(casePort(caseData, 'discharge'))]);
  const [family, setFamily] = useState('Handysize');
  const [basis, setBasis] = useState('nominal');
  const [display, setDisplay] = useState('rate');
  const [opened, setOpened] = useState(false);
  const [cells, setCells] = useState<Cell[]>([]);
  const [message, setMessage] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Fields>>({});
  const changed = (side: 'load' | 'discharge', keys: string[]) => keys.filter(key => key !== portKey(casePort(caseData, side)))
    .map(key => [side, ...(JSON.parse(key) as Port)] as const);
  const alternatives = [...changed('load', origins), ...changed('discharge', destinations)];
  useEffect(() => {
    let current = true;
    if (!opened) return;
    setCells([]);
    if (!origins.length || !destinations.length || origins.length * destinations.length > 25) {
      setMessage('Pilih minimal satu port per sisi, maksimal 25 kombinasi.');
      return;
    }
    setMessage('Menghitung rute…');
    const portOverrides = [...changed('load', origins), ...changed('discharge', destinations)].map(key => [...key, overrides[JSON.stringify(key)] ?? {}]);
    const timer = window.setTimeout(() => void request<Cell[]>('/matrix', { case: caseData, origins: origins.map(v => JSON.parse(v)), destinations: destinations.map(v => JSON.parse(v)), family, quantity_basis: basis, port_overrides: portOverrides })
      .then(value => { if (current) { setCells(value); setMessage(''); } })
      .catch(error => { if (current) setMessage(error.message); }), 300);
    return () => { current = false; window.clearTimeout(timer); };
  }, [opened, caseData, origins, destinations, family, basis, overrides]);
  const picker = (label: string, values: string[], change: (items: string[]) => void) => <label>{label}
    <select multiple size={5} value={values} onChange={event => change(Array.from(event.target.selectedOptions, x => x.value))}>
      {catalog.ports.map(port => <option key={portKey(port)} value={portKey(port)}>{port.join(', ')}</option>)}
    </select></label>;
  return <section className="card"><details onToggle={event => setOpened(event.currentTarget.open)}><summary>Spread Matrix</summary>
    <p>Pelabuhan tambahan memakai laju, biaya, dan terms dari kasus ini. Batas draft pelabuhan tambahan perlu dikonfirmasi.</p>
    <div className="grid two">{picker('Pelabuhan muat', origins, setOrigins)}{picker('Pelabuhan bongkar', destinations, setDestinations)}</div>
    <div className="grid three">
      <Select label="Kelas" options={{ Handysize: 'Handysize', Supramax: 'Supramax' }} value={family} change={setFamily} />
      <Select label="Muatan" options={{ minimum: 'Minimum', nominal: 'Nominal', maximum: 'Maksimum' }} value={basis} change={setBasis} />
      <Select label="Tampilan" options={{ rate: 'Freight · USD/MT', delta: 'Selisih vs rute dasar · USD/MT' }} value={display} change={setDisplay} />
    </div>
    {alternatives.length > 0 && <details><summary>Ubah asumsi pelabuhan tambahan</summary>
      {alternatives.map(port => {
        const [side, name, country] = port;
        const key = JSON.stringify(port);
        const update = (name: string, value: unknown) => setOverrides(old => ({ ...old, [key]: { ...old[key], [name]: value } }));
        return <div key={key}><h3>{side === 'load' ? 'Muat' : 'Bongkar'} · {name}, {country}</h3><div className="grid">
          {([['rate_mt_day', 'Laju · MT/hari'], ['port_da_usd', 'Port DA · USD'], ['draft_limit_m', 'Batas draft · m'],
            ['time_margin_percent', 'Margin waktu · %']] as const).map(([name, label]) => <Input key={name} label={label} type="number"
              value={overrides[key]?.[name] ?? (name === 'draft_limit_m' ? null : caseData.ports[side][name])}
              change={value => update(name, value || null)} />)}
          <Select label="Terms" options={Object.fromEntries(Object.entries(catalog.terms).map(([key, item]) => [key, item.label ?? key]))}
            value={String(overrides[key]?.terms ?? caseData.ports[side].terms)} change={value => update('terms', value)} />
        </div></div>;
      })}
    </details>}
    {message && <p role="status">{message}</p>}
    {cells.length > 0 && <><div className="table-wrap"><table><thead><tr><th>Pelabuhan bongkar</th>
      {origins.map(key => <th key={key}>{(JSON.parse(key) as Port)[0]}</th>)}</tr></thead>
      <tbody>{destinations.map(dest => <tr key={dest}><th>{(JSON.parse(dest) as Port)[0]}</th>{origins.map(origin => {
        const cell = cells.find(c => portKey(c.origin) === origin && portKey(c.destination) === dest);
        return <td key={origin} title={cell?.error}>{fmt(display === 'rate' ? cell?.rate : cell?.delta)}</td>;
      })}</tr>)}</tbody></table></div>
      <button type="button" onClick={() => download(JSON.stringify(cells, null, 2), 'spread-matrix.json', 'application/json')}>Download matrix</button></>}
  </details></section>;
}
