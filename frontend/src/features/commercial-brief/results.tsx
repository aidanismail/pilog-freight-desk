import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { download, type Evaluation } from '../../api/client';
import { fmt } from '../voyage/inputs';

export function Results({ evaluation }: { evaluation: Evaluation }) {
  const { result, case: data, brief } = evaluation;
  const risk = result.risk_assessment;
  const primary = risk?.primary;
  const baseline = primary && result.classes[primary.vessel_class]?.nominal?.commercial?.surplus_usd;
  const stress = primary && risk?.classes[primary.vessel_class]?.scenarios.find(row => row.driver === primary.driver);
  return <>
    <section className="card" id="hasil"><h2>Hasil freight</h2><p>{result.recommendation.action}</p>
      {primary && <div className="notice"><b>{primary.owner ? `${primary.owner} · ` : ''}{primary.vessel_class}</b>
        <p>{primary.team} · {primary.action}</p>
        {baseline != null && stress?.surplus_usd != null && <p>Surplus awal USD {fmt(baseline)} → hasil skenario USD {fmt(stress.surplus_usd)}.
          {stress.margin_basis && <small> {stress.margin_basis}.</small>}</p>}
      </div>}
      {risk && !risk.scope_matches && <p className="notice">Rute, muatan atau jadwal berubah. Tinjau komitmen dan konfirmasi lagi cakupan kasus.</p>}
      <div className="grid two">{Object.entries(result.classes).map(([family, rows]) => {
        const row = rows.nominal;
        const nominal = row.commercial;
        if (!row.feasible) return <article key={family} className="ship"><h3>{family}</h3><p>{row.error ?? 'Muatan melampaui batas kapasitas.'}</p></article>;
        return <article key={family} className="ship"><h3>{family}</h3>
          <p className="rate">{fmt(row.minimum_offer_usd_mt)} <span>USD/MT · freight impas</span></p>
          <dl><dt>Durasi voyage</dt><dd>{fmt(row.days)} hari</dd><dt>Total biaya</dt><dd>USD {fmt(row.total_usd)}</dd>
            {nominal && <><dt>Pendapatan freight</dt><dd>USD {fmt(nominal.net_freight_revenue_usd)}</dd>
              <dt>Surplus / defisit</dt><dd className={Number(nominal.surplus_usd) < 0 ? 'negative' : 'positive'}>USD {fmt(nominal.surplus_usd)}</dd>
              <dt>TCE</dt><dd>USD {fmt(nominal.tce_usd_day)}/hari</dd></>}
          </dl>
          <details><summary>Rincian biaya dan toleransi</summary><div className="table-wrap"><table><thead><tr>
            {['Aktivitas', 'Hari', 'Hire USD', 'Bunker USD', 'Port DA USD', 'Total USD'].map(x => <th key={x}>{x}</th>)}</tr></thead>
            <tbody>{(row.ledger ?? []).map((line, i) => <tr key={i}><td>{String(line.activity)}</td>
              {['days', 'hire_usd', 'bunker_usd', 'port_da_usd', 'total_usd'].map(key => <td key={key}>{fmt(line[key])}</td>)}</tr>)}</tbody></table></div>
          <div className="table-wrap"><table><thead><tr><th>Muatan</th><th>MT</th><th>Hari</th><th>Freight USD/MT</th></tr></thead>
            <tbody>{Object.entries(rows).map(([key, item]) => <tr key={key}><td>{{ minimum: 'Minimum', nominal: 'Nominal', maximum: 'Maksimum' }[key] ?? key}</td>
              <td>{fmt(item.cargo_mt)}</td><td>{fmt(item.days)}</td><td>{item.feasible ? fmt(item.freight_usd_mt) : 'Periksa kapasitas'}</td></tr>)}</tbody></table></div></details>
        </article>;
      })}</div>
    </section>
    <section className="card" id="brief"><div className="section-head"><h2>Commercial Brief</h2><button type="button"
      onClick={() => download(brief, `${data.case_id}-commercial-brief.md`, 'text/markdown;charset=utf-8')}>Download brief</button></div>
      <div className="brief"><Markdown remarkPlugins={[remarkGfm]} components={{ table: ({ children }) => <div className="table-wrap"><table>{children}</table></div> }}>{brief}</Markdown></div>
    </section>
  </>;
}
