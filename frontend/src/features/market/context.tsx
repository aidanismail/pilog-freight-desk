import type { Assessment, Evaluation } from '../../api/client';
import { fmt } from '../voyage/inputs';

export function MarketContext({ market }: { market: Evaluation['market'] }) {
  const table = (title: string, rows: Assessment[]) => <div><h3>{title}</h3>{rows.length === 0 ? <p>Pembanding belum tersedia.</p> :
    <div className="table-wrap"><table><thead><tr><th>Sumber</th><th>Produk / rute</th><th>Basis</th><th>Rentang USD/MT</th><th>Tanggal</th></tr></thead>
      <tbody>{rows.map((item, index) => <tr key={index}><td>{item.publisher}</td><td>{item.label}</td><td>{item.basis}</td>
        <td>{fmt(item.low)} – {fmt(item.high)}</td><td>{item.observation_date}</td></tr>)}</tbody></table></div>}</div>;
  return <section className="card"><details><summary>Pembanding pasar</summary>
    {table('Harga komoditas', market.prices)}{table('Pembanding voyage', market.voyages)}
  </details></section>;
}
