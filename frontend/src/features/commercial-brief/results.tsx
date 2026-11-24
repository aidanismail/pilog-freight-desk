import { lazy, Suspense } from "react";
import { Download } from "lucide-react";
import { download, type Evaluation } from "../../api/client";
import { Button } from "../../components/ui/button";
import { fmt } from "../../lib/number-format";

const BriefContent = lazy(() => import("./brief-content"));

export function Results({ evaluation }: { evaluation: Evaluation }) {
  const { result, case: data, brief } = evaluation;
  const risk = result.risk_assessment;
  const primary = risk?.primary;
  const baseline =
    primary &&
    result.classes[primary.vessel_class]?.nominal?.commercial?.surplus_usd;
  const stress =
    primary &&
    risk?.classes[primary.vessel_class]?.scenarios.find(
      (row) => row.driver === primary.driver
    );
  return (
    <>
      <section className="workspace-section scroll-mt-4" id="hasil">
        <h2>Hasil freight</h2>
        <p className="mb-4 rounded-lg bg-pilog-notice px-3.5 py-2.5 text-sm font-medium text-pilog-action">{result.recommendation.action}</p>
        {primary && (
          <div className="mt-2 mb-3.5 rounded-md bg-pilog-notice px-3.5 py-2.5">
            <b>
              {primary.owner ? `${primary.owner} · ` : ""}
              {primary.vessel_class}
            </b>
            <p>
              {primary.team} · {primary.action}
            </p>
            {baseline != null && stress?.surplus_usd != null && (
              <p>
                Surplus awal USD {fmt(baseline)} → hasil skenario USD{" "}
                {fmt(stress.surplus_usd)}.
                {stress.margin_basis && <small> {stress.margin_basis}.</small>}
              </p>
            )}
          </div>
        )}
        {risk && !risk.scope_matches && (
          <p className="mt-2 mb-3.5 rounded-md bg-pilog-notice px-3.5 py-2.5">
            Rute, muatan atau jadwal berubah. Tinjau komitmen dan konfirmasi
            lagi cakupan kasus.
          </p>
        )}
        <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
          {Object.entries(result.classes).map(([family, rows]) => {
            const row = rows.nominal;
            const nominal = row.commercial;
            if (!row.feasible)
              return (
                <article key={family} className="min-w-0 rounded-lg border border-pilog-line p-4">
                  <h3>{family}</h3>
                  <p>{row.error ?? "Muatan melampaui batas kapasitas."}</p>
                </article>
              );
            return (
              <article key={family} className="min-w-0 rounded-lg border border-pilog-line p-4">
                <h3>{family}</h3>
                <p className="mb-3 text-xs font-medium text-pilog-muted">
                  Freight impas
                  <span className="mt-0.5 block text-2xl font-semibold text-pilog-ink tabular-nums">
                  {fmt(row.minimum_offer_usd_mt)}{" "}
                    <span className="text-sm font-medium text-pilog-muted">USD/MT</span>
                  </span>
                </p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-sm [&>dd]:text-right">
                  <dt>Durasi voyage</dt>
                  <dd>{fmt(row.days)} hari</dd>
                  <dt>Total biaya</dt>
                  <dd>USD {fmt(row.total_usd)}</dd>
                  {nominal && (
                    <>
                      <dt>Pendapatan freight neto</dt>
                      <dd>USD {fmt(nominal.net_freight_revenue_usd)}</dd>
                      <dt>Surplus / defisit</dt>
                      <dd
                        className={
                          Number(nominal.surplus_usd) < 0
                            ? "font-bold text-pilog-negative"
                            : "font-bold text-pilog-positive"
                        }
                      >
                        USD {fmt(nominal.surplus_usd)}
                      </dd>
                      <dt>TCE</dt>
                      <dd>USD {fmt(nominal.tce_usd_day)}/hari</dd>
                    </>
                  )}
                </dl>
                <details>
                  <summary>Rincian biaya dan toleransi</summary>
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Aktivitas",
                            "Hari",
                            "Hire USD",
                            "Bunker USD",
                            "Port DA USD",
                            "Total USD"
                          ].map((x) => (
                            <th key={x}>{x}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(row.ledger ?? []).map((line, i) => (
                          <tr key={i}>
                            <td>{String(line.activity)}</td>
                            {[
                              "days",
                              "hire_usd",
                              "bunker_usd",
                              "port_da_usd",
                              "total_usd"
                            ].map((key) => (
                              <td key={key}>{fmt(line[key])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Muatan</th>
                          <th>MT</th>
                          <th>Hari</th>
                          <th>Freight USD/MT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(rows).map(([key, item]) => (
                          <tr key={key}>
                            <td>
                              {{
                                minimum: "Minimum",
                                nominal: "Nominal",
                                maximum: "Maksimum"
                              }[key] ?? key}
                            </td>
                            <td>{fmt(item.cargo_mt)}</td>
                            <td>{fmt(item.days)}</td>
                            <td>
                              {item.feasible
                                ? fmt(item.freight_usd_mt)
                                : "Periksa kapasitas"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
      <section className="workspace-section" id="brief">
        <div className="flex flex-wrap items-center justify-between gap-2 [&>h2]:mb-0">
          <h2>Commercial Brief</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              download(
                brief,
                `${data.case_id}-commercial-brief.md`,
                "text/markdown;charset=utf-8"
              )
            }
          >
            <Download aria-hidden /> Download brief
          </Button>
        </div>
        <Suspense fallback={<p className="mt-3 text-sm text-pilog-muted" role="status">Memuat brief…</p>}>
          <BriefContent brief={brief} />
        </Suspense>
      </section>
    </>
  );
}
