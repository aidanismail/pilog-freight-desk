import type { Evaluation } from "../../api/client";

export type HistoryEntry = {
  id: string;
  savedAt: string;
  evaluation: Evaluation;
};

export const historyPrefix = "pilog.freight-history.v1.";

export function readHistory(): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(historyPrefix)) continue;
      try {
        const entry: HistoryEntry = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (entry?.id === key.slice(historyPrefix.length) &&
            Number.isFinite(Date.parse(entry.savedAt)) &&
            entry.evaluation?.case?.ports?.load?.name &&
            entry.evaluation.case.ports.discharge?.name &&
            entry.evaluation.result?.classes &&
            entry.evaluation.result.recommendation &&
            typeof entry.evaluation.result.input_sha256 === "string" &&
            typeof entry.evaluation.package_format === "string" &&
            entry.evaluation.market &&
            typeof entry.evaluation.brief === "string") {
          entries.push(entry);
        }
      } catch {
        // A damaged entry should not hide the rest of the history.
      }
    }
  } catch {
    // The application still works when the browser blocks storage.
  }
  return entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function storeCalculation({ case: caseData, result, brief, market, package_format }: Evaluation): string {
  const id = crypto.randomUUID();
  const { classes, recommendation, risk_assessment, input_sha256 } = result;
  const entry: HistoryEntry = {
    id,
    savedAt: new Date().toISOString(),
    evaluation: { case: caseData, result: { classes, recommendation, risk_assessment, input_sha256 }, brief, market, package_format }
  };
  window.localStorage.setItem(historyPrefix + id, JSON.stringify(entry));
  return id;
}

export function removeCalculation(id: string): void {
  window.localStorage.removeItem(historyPrefix + id);
}
