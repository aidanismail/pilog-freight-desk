import type { Catalog, Fields, Risk } from "../../api/client";
import { Input, Select } from "../../components/fields";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";

const empty = (): Risk => ({
  version: "1",
  scope: "confirm",
  commitments: {},
  stresses: {}
});
const choices = { unknown: "Belum diketahui", yes: "Ya", no: "Belum" };
const clauseLabels = {
  unknown: "Belum diketahui",
  review: "Perlu ditinjau",
  recorded: "Tercatat"
};

export function RiskPanel({
  value,
  catalog,
  change
}: {
  value?: Risk;
  catalog: Catalog["risk"];
  change: (value: Risk | null) => void;
}) {
  const data = value ?? empty();
  const set = (key: string, input: unknown) =>
    change({ ...data, [key]: input });
  const commitment = (
    key: string,
    name: string,
    current: Fields,
    setItem: (newValue: Fields) => void,
    unit?: string
  ) => {
    const input = (key: string, label: string, type = "text") => (
      <Input
        key={key}
        label={label}
        type={type}
        value={current[key]}
        change={(v) => setItem({ ...current, [key]: v })}
      />
    );
    const status = String(current.status ?? "unknown");
    return (
      <div key={key} className="grid content-start gap-2">
        <Select
          label={name}
          options={catalog.statuses}
          value={status}
          change={(status) => setItem({ ...current, status })}
        />
        {status === "binding" && (
          <>
            <Select
              label="Dasar harga"
              options={catalog.bases}
              value={String(current.basis ?? "unknown")}
              change={(basis) => setItem({ ...current, basis })}
            />
            {input("coverage_percent", "Cakupan tarif tetap (%)", "number")}
          </>
        )}
        {status !== "unknown" && input("evidence", "Rujukan konfirmasi")}
        {unit && status !== "unknown" && (
          <>
            {input("rate", `Tarif tercatat (${unit})`, "number")}
            {input("agreed_on", "Tanggal tercatat", "date")}
            {input("valid_until", "Berlaku sampai", "date")}
          </>
        )}
        {key === "charter" && (
          <>
            <Select
              label="Kelas kapal yang disewa"
              options={{
                "": "Belum ditetapkan",
                Handysize: "Handysize",
                Supramax: "Supramax"
              }}
              value={String(current.vessel_class ?? "")}
              change={(vessel_class) =>
                setItem({ ...current, vessel_class: vessel_class || null })
              }
            />
            <Select
              label="Kapal sudah dinominasikan"
              options={choices}
              value={
                data.vessel_nominated == null
                  ? "unknown"
                  : data.vessel_nominated
                    ? "yes"
                    : "no"
              }
              change={(v) =>
                set("vessel_nominated", v === "unknown" ? null : v === "yes")
              }
            />
            {status === "open" && current.rate != null && (
              <label className="my-2.5 flex items-center gap-2">
                <Checkbox
                  aria-label="Quotation sesuai rute, periode, dan cakupan biaya"
                  checked={current.quote_comparable === true}
                  onCheckedChange={(checked) =>
                    setItem({ ...current, quote_comparable: checked === true })
                  }
                />
                Quotation sesuai rute, periode, dan cakupan biaya
              </label>
            )}
          </>
        )}
      </div>
    );
  };
  return (
    <section className="workspace-section">
      <h2 className="font-black">Risiko dan Komitmen Transaksi</h2>
      <label className="my-2.5 flex items-center gap-2">
        <Checkbox
          aria-label="Analisis risiko dan mitigasi"
          checked={Boolean(value)}
          onCheckedChange={(checked) => change(checked ? empty() : null)}
        />
        Analisis risiko dan mitigasi
      </label>
      {value && (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-3 [&>*]:min-w-0">
            {Object.entries(catalog.agreements).map(([key, label]) =>
              commitment(
                key,
                label,
                data.commitments[key] ?? {},
                (item) =>
                  set("commitments", { ...data.commitments, [key]: item }),
                key === "charter" ? "USD/hari" : "USD/MT"
              )
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => set("scope", "confirm")}
          >
            Konfirmasi cakupan kasus
          </Button>
          <details>
            <summary>Klausul penyesuaian tarif</summary>
            <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-3 [&>*]:min-w-0">
              {Object.entries(catalog.agreements).map(([key, label]) => {
                const all = (data.clauses ?? {}) as Record<string, Fields>;
                const current = all[key] ?? {};
                const update = (field: string, input: string) =>
                  set("clauses", {
                    ...all,
                    [key]: { ...current, [field]: input }
                  });
                return (
                  <div key={key} className="space-y-2.5">
                    <h3>{label}</h3>
                    <Select
                      label="Status klausul"
                      options={clauseLabels}
                      value={String(current.status ?? "unknown")}
                      change={(v) => update("status", v)}
                    />
                    <Input
                      label="Dokumen atau nomor pasal"
                      value={current.reference}
                      change={(v) => update("reference", v)}
                    />
                    <Input
                      label="Biaya, pemicu, dan cakupan"
                      value={current.coverage}
                      change={(v) => update("coverage", v)}
                    />
                  </div>
                );
              })}
            </div>
          </details>
          <details>
            <summary>Skenario perubahan biaya dan durasi</summary>
            <p className="mb-3 text-sm text-pilog-muted">
              Masukkan selisih harga atau hari. Muatan dan draft diisi sebagai
              nilai baru.
            </p>
            <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-3 [&>*]:min-w-0">
              {Object.entries(catalog.stresses).map(([key, [label, unit]]) => (
                <Input
                  key={key}
                  label={`${label} · ${unit}`}
                  type="number"
                  value={data.stresses?.[key]}
                  change={(v) =>
                    set("stresses", {
                      ...data.stresses,
                      [key]: v === "" ? null : v
                    })
                  }
                />
              ))}
            </div>
          </details>
          <details>
            <summary>Bunker, waktu tunggu, dan kontrak</summary>
            <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-3 [&>*]:min-w-0">
              {["VLSFO", "LSMGO", "port_delay"].map((key) => {
                const item = (data[key] ?? {}) as Fields;
                const title =
                  key === "port_delay" ? "biaya tunggu di pelabuhan" : key;
                return (
                  <div key={key} className="space-y-2.5">
                    <Select
                      label={`Penanggung ${title}`}
                      options={catalog.parties}
                      value={String(item.payer ?? "unknown")}
                      change={(payer) => set(key, { ...item, payer })}
                    />
                    {key === "port_delay" ? (
                      <Input
                        label="Rujukan biaya waktu tunggu"
                        value={item.evidence}
                        change={(evidence) => set(key, { ...item, evidence })}
                      />
                    ) : (
                      commitment(key, `Status ${title}`, item, (updated) =>
                        set(key, updated)
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
              {Object.entries({
                payable_usd: "Demurrage terutang (USD)",
                recoverable_usd: "Demurrage yang dapat ditagih (USD)",
                basis: "Pihak pembayar, tarif, dan waktu klaim",
                evidence: "Rujukan klausul demurrage"
              }).map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  type={key.endsWith("_usd") ? "number" : "text"}
                  value={(data.demurrage as Fields | undefined)?.[key]}
                  change={(v) =>
                    set("demurrage", {
                      ...((data.demurrage as Fields) ?? {}),
                      [key]: v
                    })
                  }
                />
              ))}
            </div>
            <label className="my-2.5 flex items-center gap-2">
              <Checkbox
                aria-label="Program pengiriman berulang"
                checked={data.recurring_program === true}
                onCheckedChange={(checked) =>
                  set("recurring_program", checked === true)
                }
              />
              Program pengiriman berulang
            </label>
            <div className="mb-3 grid grid-cols-1 gap-3.5 min-[681px]:grid-cols-2 [&>*]:min-w-0">
              <Input
                label="Eksposur kurs dan rujukan"
                value={data.fx_evidence}
                change={(v) => set("fx_evidence", v)}
              />
              <Input
                label="Tanggung jawab maritim dan rujukan"
                value={data.liability_evidence}
                change={(v) => set("liability_evidence", v)}
              />
            </div>
          </details>
        </>
      )}
    </section>
  );
}
