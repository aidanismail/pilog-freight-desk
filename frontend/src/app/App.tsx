import { useEffect, useRef, useState } from 'react';
import { download, request, type Case, type Catalog, type Evaluation, type Fields, type Port, type Risk } from '../api/client';
import { casePort, Voyage } from '../features/voyage/inputs';
import { Hire } from '../features/market/hire';
import { MarketContext } from '../features/market/context';
import { RiskPanel } from '../features/risk/panel';
import { Results } from '../features/commercial-brief/results';
import { SpreadMatrix } from '../features/spread-matrix/matrix';
import logo from '../assets/pilog.png';

export function App() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [caseData, setCase] = useState<Case>();
  const [edits, setEdits] = useState<Fields>({});
  const [result, setResult] = useState<Evaluation>();
  const [busy, setBusy] = useState('Memuat Freight Desk…');
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function reset(next: Case) {
    setCase(next);
    setEdits({});
    setResult(undefined);
  }
  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Terjadi kesalahan.'); }
    finally { setBusy(''); }
  }
  async function newCase() {
    const response = await request<{ case: Case; market_fallback: boolean }>('/cases/default');
    reset(response.case);
    setFallback(response.market_fallback);
  }
  useEffect(() => { void run('Memuat Freight Desk…', async () => {
    await Promise.all([request<Catalog>('/catalog').then(setCatalog), newCase()]);
  }); }, []);

  function edit(path: string, value: unknown) {
    setEdits(prev => ({ ...prev, [path]: value }));
    setResult(undefined);
  }
  function get(path: string): unknown {
    if (path in edits) return edits[path];
    return path.split('.').reduce<unknown>((value, key) => value != null ? (value as Fields)[key] : undefined, caseData);
  }
  async function changePort(side: 'load' | 'discharge', port: Port) {
    if (!caseData) return;
    await run('Memperbarui rute…', async () => {
      const next = await request<{ case: Case }>('/cases/route', { case: caseData, edits,
        load: side === 'load' ? port : casePort(caseData, 'load'), discharge: side === 'discharge' ? port : casePort(caseData, 'discharge') });
      reset(next.case);
    });
  }
  async function evaluate() {
    await run('Menghitung freight…', async () => {
      const response = await request<Evaluation>('/evaluate', { case: caseData, edits });
      setCase(response.case);
      setEdits({});
      setResult(response);
      requestAnimationFrame(() => document.getElementById('hasil')?.scrollIntoView({ block: 'start' }));
    });
  }
  async function save() {
    await run('Menyiapkan paket…', async () => {
      const payload = await request<Fields>('/cases/export', { case: caseData, edits });
      download(JSON.stringify(payload, null, 2), `${caseData?.case_id ?? 'freight-case'}.json`, 'application/json');
    });
  }
  return <><header><div className="header-inner"><img src={logo} alt="Pupuk Indonesia Logistik" />
    <div className="heading"><span>Dry-bulk chartering</span><h1>PILOG Freight Desk</h1></div>
    <div className="toolbar"><button type="button" disabled={Boolean(busy)} onClick={() => void run('Memuat kasus baru…', newCase)}>Kasus baru</button>
      <button type="button" disabled={Boolean(busy)} onClick={() => input.current?.click()}>Buka paket kasus</button>
      <input ref={input} aria-label="File paket kasus" type="file" accept=".json,application/json" hidden onChange={event => {
        const file = event.target.files?.[0];
        if (file) void run('Membuka paket…', async () => { reset((await request<{ case: Case }>('/cases/import', undefined, file)).case); setFallback(false); });
        event.target.value = '';
      }} />
      <button type="button" disabled={!caseData || Boolean(busy)} onClick={() => void save()}>Download kasus</button>
    </div></div></header>
    <main>
      {busy && <p className="notice" role="status">{busy}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {fallback && <p className="notice">Fearnpulse memakai snapshot terakhir yang tersimpan. Tanggal observasi tersedia di brief.</p>}
      {catalog && caseData && <>
        <fieldset disabled={Boolean(busy)}>
          <Voyage caseData={caseData} catalog={catalog} get={get} edit={edit} changePort={(side, port) => void changePort(side, port)} />
          <Hire caseData={caseData} get={get} edit={edit} edits={edits} />
          <RiskPanel value={(get('risk_assessment') ?? undefined) as Risk | undefined} catalog={catalog.risk} change={value => edit('risk_assessment', value)} />
          <div className="calculate"><button type="button" className="primary" onClick={() => void evaluate()}>Hitung freight</button></div>
        </fieldset>
        {result && <><Results evaluation={result} /><MarketContext market={result.market} /><SpreadMatrix key={result.case.case_id} caseData={result.case} catalog={catalog} /></>}
      </>}
    </main></>;
}
