import type { Case, Catalog, Fields, Port } from "../../api/client";
import { Plus, Trash2 } from "lucide-react";
import { Input, PortPicker, Select } from "../../components/fields";
import { Button } from "../../components/ui/button";
import { Calendar } from "./calendar";

export type Edit = (path: string, value: unknown) => void;

export const portKey = (port: Port) => JSON.stringify(port);
export const portOptions = (entries: Port[]) =>
  Object.fromEntries(entries.map((port) => [portKey(port), port.join(", ")]));
export const casePort = (caseData: Case, side: "load" | "discharge"): Port => [
  caseData.ports[side].name,
  caseData.ports[side].country
];

export function Voyage({
  caseData,
  catalog,
  get,
  edit,
  changePort
}: {
  caseData: Case;
  catalog: Catalog;
  get: (path: string) => unknown;
  edit: Edit;
  changePort: (side: "load" | "discharge", newPort: Port) => void;
}) {
  const field = (path: string, title: string, optional = false) => (
    <Input
      key={path}
      label={title}
      value={get(path)}
      type="number"
      optional={optional}
      change={(value) => edit(path, value === "" ? null : value)}
    />
  );
  const options = portOptions(catalog.ports);
  for (const side of ["load", "discharge"] as const)
    options[portKey(casePort(caseData, side))] = casePort(caseData, side).join(
      ", "
    );
  const terms = Object.fromEntries(
    Object.entries(catalog.terms).map(([key, term]) => [key, term.label ?? key])
  );
  return (
    <>
      <section className="workspace-section">
        <h2 className="font-black">Rute dan Muatan</h2>
        <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
          {(["load", "discharge"] as const).map((side) => (
            <PortPicker
              key={side}
              label={side === "load" ? "Pelabuhan muat" : "Pelabuhan bongkar"}
              options={options}
              value={portKey(casePort(caseData, side))}
              change={(value) => changePort(side, JSON.parse(value) as Port)}
            />
          ))}
        </div>
        <div className="mb-3.5 grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Komoditas"
            options={catalog.commodities}
            value={String(get("commodity"))}
            change={(value) => edit("commodity", value)}
          />
          {field("cargo_mt", "Muatan nominal (MT)")}
          {field("stowage_factor_m3_mt", "Stowage factor (m³/MT)")}
          {field("tolerance_percent", "Toleransi muatan (%)")}
        </div>
        <div className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {field("distance_nm", "Jarak laut (NM)")}
          <Input
            label="Mulai muat (UTC)"
            type="datetime-local"
            value={String(get("start_at") ?? "").slice(0, 16)}
            change={(value) => edit("start_at", value)}
          />
          {field("selling_freight_usd_mt", "Tarif jual freight (USD/MT)", true)}
        </div>
        {get("distance_nm") == null && (
          <p className="mt-2 mb-3.5 rounded-md bg-pilog-notice px-3.5 py-2.5">
            Jarak laut belum tersedia. Masukkan jarak dalam mil laut (NM).
          </p>
        )}
      </section>
      <section className="workspace-section">
        <h2 className="font-black">Operasi Pelabuhan</h2>
        <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
          {(["load", "discharge"] as const).map((side) => {
            const path = `ports.${side}`;
            const calendar = get(`${path}.calendar`) as Fields;
            return (
              <div
                key={side}
                className="rounded-lg border border-pilog-line bg-pilog-canvas/45 p-3.5 sm:p-4"
              >
                <h3>{side === "load" ? "Pemuatan" : "Pembongkaran"}</h3>
                <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2 [&>*]:min-w-0">
                  {field(`${path}.rate_mt_day`, "Laju penanganan (MT/hari)")}
                  {field(`${path}.port_da_usd`, "Port DA (USD)")}
                  <Select
                    label="Laytime terms"
                    options={terms}
                    value={String(get(`${path}.terms`))}
                    change={(value) => edit(`${path}.terms`, value)}
                  />
                  <Select
                    label="Hitung waktu berdasarkan"
                    options={{
                      factor: "Faktor laytime terms",
                      calendar: "Kalender operasi"
                    }}
                    value={String(get(`${path}.time_basis`))}
                    change={(value) => edit(`${path}.time_basis`, value)}
                  />
                  {field(`${path}.time_margin_percent`, "Margin waktu (%)")}
                  {field(`${path}.draft_limit_m`, "Batas draft (m)")}
                  {field(`${path}.waiting_days`, "Waktu tunggu (hari)")}
                  {field(`${path}.allowance_days`, "Waktu tambahan (hari)")}
                  {get(`${path}.time_basis`) === "calendar" && (
                    <Calendar
                      value={calendar}
                      defaults={
                        catalog.work_windows[String(get(`${path}.terms`))]
                      }
                      change={(value) => edit(`${path}.calendar`, value)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="workspace-section">
        <h2 className="font-black">Bunker dan Biaya Tambahan</h2>
        <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] [&>*]:min-w-0">
          {field("fuel.VLSFO.value", "Harga VLSFO (USD/MT)")}
          {field("fuel.LSMGO.value", "Harga LSMGO (USD/MT)")}
          {field("bunker_delay_days", "Waktu tambahan untuk bunker (hari)")}
        </div>
        <details>
          <summary>Biaya tambahan</summary>
          {((get("other_costs") ?? []) as Fields[]).map((line, index, rows) => (
            <div
              className="mb-3 grid grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_auto] items-end gap-2 sm:gap-3"
              key={String(line.id ?? index)}
            >
              <Input
                label="Nama biaya"
                value={line.label}
                change={(label) =>
                  edit(
                    "other_costs",
                    rows.map((row, i) =>
                      i === index ? { ...row, label } : row
                    )
                  )
                }
              />
              <Input
                label="Jumlah (USD)"
                type="number"
                value={line.amount}
                change={(amount) =>
                  edit(
                    "other_costs",
                    rows.map((row, i) =>
                      i === index ? { ...row, amount } : row
                    )
                  )
                }
              />
              <Button
                variant="danger"
                size="icon"
                className="mb-1"
                aria-label={`Hapus biaya ${String(line.label || index + 1)}`}
                title="Hapus biaya"
                onClick={() =>
                  edit(
                    "other_costs",
                    rows.filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              edit("other_costs", [
                ...((get("other_costs") ?? []) as Fields[]),
                {
                  id: crypto.randomUUID(),
                  unit: "USD",
                  label: "Biaya lain",
                  amount: "0"
                }
              ])
            }
          >
            <Plus aria-hidden /> Tambah biaya
          </Button>
        </details>
      </section>
    </>
  );
}
