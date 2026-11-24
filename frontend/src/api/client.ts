export type Port = [string, string];
export type Fields = Record<string, unknown>;
export type Source = { status: string; source?: string; benchmark_code?: string; observed_on?: string; description?: string };
export type Case = Fields & {
  case_id: string;
  ports: Record<'load' | 'discharge', Fields & { name: string; country: string }>;
  profiles: Record<string, Fields>;
  sources: Record<string, Source>;
  fuel: Record<string, Fields>;
  risk_assessment?: Risk;
};
export type Risk = Fields & { version: string; scope?: unknown; commitments: Record<string, Fields>; stresses?: Fields };
export type Catalog = {
  ports: Port[]; commodities: Record<string, string>;
  terms: Record<string, { label?: string }>;
  work_windows: Record<string, Record<string, number[][]>>;
  risk: { agreements: Record<string, string>; statuses: Record<string, string>; bases: Record<string, string>;
    parties: Record<string, string>; stresses: Record<string, [string, string]> };
};
type Exposure = { owner?: string; action: string; team: string; vessel_class: string; driver?: string };
type Stress = { driver: string; delta_usd?: string; surplus_usd?: string; basis: string; margin_basis?: string };
export type Row = { feasible: boolean; error?: string; cargo_mt: string; days?: string; total_usd?: string;
  freight_usd_mt?: string; minimum_offer_usd_mt?: string; hire_usd?: string; bunker_usd?: string; port_da_usd?: string;
  commercial?: { surplus_usd: string; tce_usd_day: string; net_freight_revenue_usd: string };
  ledger?: Fields[]; capacity?: { limit_mt: string } };
export type Assessment = { publisher: string; label: string; basis: string; low: string; high: string; observation_date: string };
export type Evaluation = { case: Case; brief: string; market: { prices: Assessment[]; voyages: Assessment[] }; result: { recommendation: Exposure;
  classes: Record<string, Record<string, Row>>; risk_assessment?: { primary?: Exposure; scope_matches: boolean;
    classes: Record<string, { scenarios: Stress[] }> } } };

export async function request<T>(path: string, body?: unknown, file?: File): Promise<T> {
  const response = await fetch(`/api/v1${path}`, file ? { method: 'POST', body: file }
    : body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.detail === 'string' ? value.detail : 'Periksa format dan isi input.');
  return value as T;
}

export function download(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
