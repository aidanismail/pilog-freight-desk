import { useEffect, useRef, useState } from "react";
import { Calculator, Download, FolderOpen, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  download,
  request,
  type Case,
  type Catalog,
  type Evaluation,
  type Fields,
  type Port,
  type Risk
} from "../api/client";
import { casePort, Voyage } from "../features/voyage/inputs";
import { Hire } from "../features/market/hire";
import { MarketContext } from "../features/market/context";
import { RiskPanel } from "../features/risk/panel";
import { Results } from "../features/commercial-brief/results";
import { SpreadMatrix } from "../features/spread-matrix/matrix";
import { CaseHistory } from "../features/case-history/sidebar";
import { historyPrefix, readHistory, removeCalculation, storeCalculation, type HistoryEntry } from "../features/case-history/storage";
import logo from "../assets/pilog.png";

export function App() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [caseData, setCase] = useState<Case>();
  const [edits, setEdits] = useState<Fields>({});
  const [result, setResult] = useState<Evaluation>();
  const [busy, setBusy] = useState("Memuat Freight Desk…");
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [activeEntry, setActiveEntry] = useState<string>();
  const [historyError, setHistoryError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function reset(next: Case) {
    setCase(next);
    setEdits({});
    setResult(undefined);
    setActiveEntry(undefined);
    setHistoryError("");
  }
  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Terjadi kesalahan.");
    } finally {
      setBusy("");
    }
  }
  async function newCase() {
    const response = await request<{ case: Case; market_fallback: boolean }>(
      "/cases/default"
    );
    reset(response.case);
    setFallback(response.market_fallback);
  }
  useEffect(() => {
    void run("Memuat Freight Desk…", async () => {
      await Promise.all([
        request<Catalog>("/catalog").then(setCatalog),
        newCase()
      ]);
    });
  }, []);
  useEffect(() => {
    function syncHistory(event: StorageEvent) {
      if (event.key === null || event.key.startsWith(historyPrefix)) setHistory(readHistory());
    }
    window.addEventListener("storage", syncHistory);
    return () => window.removeEventListener("storage", syncHistory);
  }, []);

  function edit(path: string, value: unknown) {
    setEdits((prev) => ({ ...prev, [path]: value }));
    setResult(undefined);
    setActiveEntry(undefined);
  }
  function get(path: string): unknown {
    if (path in edits) return edits[path];
    return path
      .split(".")
      .reduce<unknown>(
        (value, key) => (value != null ? (value as Fields)[key] : undefined),
        caseData
      );
  }
  async function changePort(side: "load" | "discharge", port: Port) {
    if (!caseData) return;
    await run("Memperbarui rute…", async () => {
      const next = await request<{ case: Case }>("/cases/route", {
        case: caseData,
        edits,
        load: side === "load" ? port : casePort(caseData, "load"),
        discharge: side === "discharge" ? port : casePort(caseData, "discharge")
      });
      reset(next.case);
    });
  }
  async function evaluate() {
    await run("Menghitung freight…", async () => {
      const response = await request<Evaluation>("/evaluate", {
        case: caseData,
        edits
      });
      setCase(response.case);
      setEdits({});
      setResult(response);
      setHistoryError("");
      try {
        setActiveEntry(storeCalculation(response));
        setHistory(readHistory());
      } catch {
        setActiveEntry(undefined);
        setHistoryError("Riwayat gagal disimpan di browser. Gunakan Download kasus untuk menyimpan paket ini.");
      }
      scrollToResult();
    });
  }
  function scrollToResult() {
    requestAnimationFrame(() => document.getElementById("hasil")?.scrollIntoView({ block: "start" }));
  }
  function openHistory(entry: HistoryEntry) {
    reset(entry.evaluation.case);
    setError("");
    setFallback(false);
    setActiveEntry(entry.id);
    setResult(entry.evaluation);
    scrollToResult();
  }
  function removeHistory(entry: HistoryEntry) {
    if (!window.confirm("Hapus kasus ini dari riwayat browser?")) return;
    try {
      removeCalculation(entry.id);
      setHistory(readHistory());
      if (activeEntry === entry.id) setActiveEntry(undefined);
    } catch {
      setHistoryError("Kasus gagal dihapus dari riwayat browser.");
    }
  }
  function downloadHistory({ evaluation, savedAt }: HistoryEntry) {
    const suffix = savedAt.replace(/[:.]/g, "-");
    download(JSON.stringify({
      format: evaluation.package_format,
      sha256: evaluation.result.input_sha256,
      case: evaluation.case
    }, null, 2), `${evaluation.case.case_id}-${suffix}.json`, "application/json");
  }
  async function save(data: Case, changes: Fields) {
    await run("Menyiapkan paket…", async () => {
      const payload = await request<Fields>("/cases/export", {
        case: data,
        edits: changes
      });
      download(
        JSON.stringify(payload, null, 2),
        `${data.case_id ?? "freight-case"}.json`,
        "application/json"
      );
    });
  }
  return (
    <>
      <header className="border-b border-pilog-line bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 sm:px-7">
          <img
            className="h-9 w-auto shrink-0 object-contain sm:h-11"
            src={logo}
            alt="Pupuk Indonesia Logistik"
          />
          <div className="flex-1">
            <h1 className="font-bold">PILOG Freight Desk</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
            <Button
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => void run("Memuat kasus baru…", newCase)}
            >
              <Plus aria-hidden /> Kasus baru
            </Button>
            <Button
              variant="ghost"
              disabled={Boolean(busy)}
              onClick={() => input.current?.click()}
            >
              <FolderOpen aria-hidden /> Buka paket kasus
            </Button>
            <input
              ref={input}
              aria-label="File paket kasus"
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  void run("Membuka paket…", async () => {
                    reset(
                      (
                        await request<{ case: Case }>(
                          "/cases/import",
                          undefined,
                          file
                        )
                      ).case
                    );
                    setFallback(false);
                  });
                event.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              disabled={!caseData || Boolean(busy)}
              onClick={() => { if (caseData) void save(caseData, edits); }}
            >
              <Download aria-hidden /> Download kasus
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1480px] items-start gap-4 px-4 pt-4 pb-14 sm:px-7 sm:pt-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <CaseHistory entries={history} active={activeEntry} commodities={catalog?.commodities} disabled={Boolean(busy)}
          onOpen={openHistory} onDownload={downloadHistory} onRemove={removeHistory} />
        <main className="min-w-0">
        {busy && (
          <p
            className="mt-2 mb-3.5 rounded-md bg-pilog-notice px-3.5 py-2.5"
            role="status"
          >
            {busy}
          </p>
        )}
        {error && (
          <p
            className="mt-2 mb-3.5 rounded-md bg-pilog-error px-3.5 py-2.5 text-pilog-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {historyError && (
          <p className="mb-3.5 rounded-md bg-pilog-error px-3.5 py-2.5 text-pilog-danger" role="alert">{historyError}</p>
        )}
        {fallback && (
          <p className="mt-2 mb-3.5 rounded-md bg-pilog-notice px-3.5 py-2.5">
            Fearnpulse sedang tidak tersedia. Menggunakan data terakhir yang
            tersimpan. Tanggal sumber ada di Commercial Brief.
          </p>
        )}
        {catalog && caseData && (
          <>
            <fieldset className="min-w-0" disabled={Boolean(busy)}>
              <Voyage
                caseData={caseData}
                catalog={catalog}
                get={get}
                edit={edit}
                changePort={(side, port) => void changePort(side, port)}
              />
              <Hire caseData={caseData} get={get} edit={edit} edits={edits} />
              <RiskPanel
                value={
                  (get("risk_assessment") ?? undefined) as Risk | undefined
                }
                catalog={catalog.risk}
                change={(value) => edit("risk_assessment", value)}
              />
              <div className="mt-0.5 mb-[18px] flex justify-end">
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => void evaluate()}
                >
                  Hitung Freight
                </Button>
              </div>
            </fieldset>
          </>
        )}
        {result && (
          <>
            <Results evaluation={result} />
            <MarketContext market={result.market} />
            {catalog && <SpreadMatrix
              key={activeEntry ?? result.case.case_id}
              caseData={result.case}
              catalog={catalog}
            />}
          </>
        )}
        </main>
      </div>
    </>
  );
}
