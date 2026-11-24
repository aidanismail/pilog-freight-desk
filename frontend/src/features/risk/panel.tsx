import type { Catalog, Fields, Risk } from '../../api/client';
import { Input, Select } from '../voyage/inputs';

const empty = (): Risk => ({ version: '1', scope: 'confirm', commitments: {}, stresses: {} });
const choices = { unknown: 'Belum diketahui', yes: 'Ya', no: 'Belum' };
const clauseLabels = { unknown: 'Belum diketahui', review: 'Perlu review', recorded: 'Tercatat' };

export function RiskPanel({ value, catalog, change }: { value?: Risk; catalog: Catalog['risk']; change: (value: Risk | null) => void }) {
  const data = value ?? empty();
  const set = (key: string, input: unknown) => change({ ...data, [key]: input });
  const commitment = (key: string, name: string, current: Fields, setItem: (newValue: Fields) => void, unit?: string) => {
    const input = (key: string, label: string, type = 'text') => <Input key={key} label={label} type={type} value={current[key]}
      change={v => setItem({ ...current, [key]: v })} />;
    const status = String(current.status ?? 'unknown');
    return <div key={key} className="contract">
      <Select label={name} options={catalog.statuses} value={status} change={status => setItem({ ...current, status })} />
      {status === 'binding' && <>
        <Select label="Dasar harga" options={catalog.bases} value={String(current.basis ?? 'unknown')}
          change={basis => setItem({ ...current, basis })} />
        {input('coverage_percent', 'Cakupan tetap · %', 'number')}
      </>}
      {status !== 'unknown' && input('evidence', 'Rujukan / konfirmasi')}
      {unit && status !== 'unknown' && <>{input('rate', `Tarif tercatat · ${unit}`, 'number')}
        {input('agreed_on', 'Tanggal tercatat', 'date')}{input('valid_until', 'Berlaku sampai', 'date')}</>}
      {key === 'charter' && <>
        <Select label="Kelas pada komitmen sewa" options={{ '': 'Belum ditetapkan', Handysize: 'Handysize', Supramax: 'Supramax' }}
          value={String(current.vessel_class ?? '')} change={vessel_class => setItem({ ...current, vessel_class: vessel_class || null })} />
        <Select label="Kapal sudah dinominasikan" options={choices}
          value={data.vessel_nominated == null ? 'unknown' : data.vessel_nominated ? 'yes' : 'no'}
          change={v => set('vessel_nominated', v === 'unknown' ? null : v === 'yes')} />
        {status === 'open' && current.rate != null && <label className="check"><input type="checkbox" checked={current.quote_comparable === true}
          onChange={e => setItem({ ...current, quote_comparable: e.target.checked })} />Quotation sesuai rute, periode, dan cakupan biaya</label>}
      </>}
    </div>;
  };
  return <section className="card"><h2>Status transaksi</h2>
    <label className="check"><input type="checkbox" checked={Boolean(value)} onChange={e => change(e.target.checked ? empty() : null)} />Analisis risiko dan mitigasi</label>
    {value && <>
      <div className="grid three">{Object.entries(catalog.agreements).map(([key, label]) => commitment(key, label, data.commitments[key] ?? {},
        item => set('commitments', { ...data.commitments, [key]: item }), key === 'charter' ? 'USD/hari' : 'USD/MT'))}</div>
      <button type="button" onClick={() => set('scope', 'confirm')}>Konfirmasi cakupan kasus</button>
      <details><summary>Klausul penyesuaian tarif</summary>
        <div className="grid three">
          {Object.entries(catalog.agreements).map(([key, label]) => {
            const all = (data.clauses ?? {}) as Record<string, Fields>;
            const current = all[key] ?? {};
            const update = (field: string, input: string) => set('clauses', { ...all, [key]: { ...current, [field]: input } });
            return <div key={key}><h3>{label}</h3>
              <Select label="Status klausul" options={clauseLabels} value={String(current.status ?? 'unknown')} change={v => update('status', v)} />
              <Input label="Dokumen / nomor pasal" value={current.reference} change={v => update('reference', v)} />
              <Input label="Biaya, pemicu, dan cakupan" value={current.coverage} change={v => update('coverage', v)} />
            </div>;
          })}
        </div>
      </details>
      <details><summary>Uji perubahan biaya dan durasi</summary><p>Masukkan selisih harga atau hari. Muatan dan draft diisi sebagai nilai baru.</p>
        <div className="grid three">{Object.entries(catalog.stresses).map(([key, [label, unit]]) => <Input key={key}
          label={`${label} · ${unit}`} type="number" value={data.stresses?.[key]}
          change={v => set('stresses', { ...data.stresses, [key]: v === '' ? null : v })} />)}</div>
      </details>
      <details><summary>Bunker, delay, dan kontrak terkait</summary>
        <div className="grid three">{['VLSFO', 'LSMGO', 'port_delay'].map(key => {
          const item = (data[key] ?? {}) as Fields;
          const title = key === 'port_delay' ? 'Waktu tunggu di port' : key;
          return <div key={key}>
            <Select label={`Penanggung ${title}`} options={catalog.parties} value={String(item.payer ?? 'unknown')}
              change={payer => set(key, { ...item, payer })} />
            {key === 'port_delay' ? <Input label="Rujukan biaya tambahan hari" value={item.evidence} change={evidence => set(key, { ...item, evidence })} />
              : commitment(key, `Status ${title}`, item, updated => set(key, updated))}
          </div>;
        })}</div>
        <div className="grid two">{Object.entries({ payable_usd: 'Demurrage terutang · USD', recoverable_usd: 'Demurrage bisa ditagih · USD',
          basis: 'Pihak pembayar, tarif, dan waktu klaim', evidence: 'Rujukan klausul demurrage' }).map(([key, label]) => <Input key={key}
          label={label} type={key.endsWith('_usd') ? 'number' : 'text'} value={(data.demurrage as Fields | undefined)?.[key]}
          change={v => set('demurrage', { ...(data.demurrage as Fields ?? {}), [key]: v })} />)}</div>
        <label className="check"><input type="checkbox" checked={data.recurring_program === true}
          onChange={e => set('recurring_program', e.target.checked)} />Program pengiriman berulang</label>
        <div className="grid two"><Input label="Arus kas beda mata uang dan rujukan" value={data.fx_evidence} change={v => set('fx_evidence', v)} />
          <Input label="Tanggung jawab maritim dan rujukan" value={data.liability_evidence} change={v => set('liability_evidence', v)} /></div>
      </details>
    </>}
  </section>;
}
