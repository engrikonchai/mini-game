/** localStorage access that never throws (private mode, blocked storage, quota). */

const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    return v ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string): boolean {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const BEST_KEY = 'dokznas.best';
const REPORTS_KEY = 'dokznas.reports';

export function loadBest(): number {
  const n = Number.parseInt(read(BEST_KEY) ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function saveBest(best: number): boolean {
  return write(BEST_KEY, String(best));
}

export interface AnswerReport {
  question: string;
  answer: string;
  at: string;
}

export function loadReports(): AnswerReport[] {
  try {
    const parsed = JSON.parse(read(REPORTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns true when persisted to localStorage, false when kept only for this session. */
export function saveReport(report: AnswerReport): boolean {
  const all = loadReports();
  all.push(report);
  return write(REPORTS_KEY, JSON.stringify(all.slice(-200)));
}
