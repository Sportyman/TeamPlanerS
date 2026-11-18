import { APP_VERSION } from '../../config/version';
import { formatLogMeta, sanitizeLogMessage } from './logSanitizer';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SYNC' | 'WA' | 'NAV' | 'STATE';

export interface SystemLogEntry {
  id: number;
  time: string;
  type: LogLevel;
  msg: string;
  meta?: string;
}

export interface DiagnosticTelemetrySnapshot {
  activeClub?: string | null;
  syncStatus?: string;
  clubsCount?: number;
  peopleCount?: number;
  presentCount?: number;
  unreadNotifications?: number;
  authenticated?: boolean;
  isSuperAdmin?: boolean;
}

const MAX_LOG_ENTRIES = 2000;
let seqId = 1;
const systemLogs: SystemLogEntry[] = [];
const listeners = new Set<() => void>();
let telemetryProvider: (() => DiagnosticTelemetrySnapshot) | null = null;
let globalErrorsInstalled = false;

const notifyListeners = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore listener errors */ }
  });
};

export const registerTelemetryProvider = (provider: () => DiagnosticTelemetrySnapshot) => {
  telemetryProvider = provider;
};

export const addLog = (
  msg: string,
  type: LogLevel = 'INFO',
  meta?: Record<string, unknown>
) => {
  const safeMsg = sanitizeLogMessage(msg);
  const safeMeta = formatLogMeta(meta);
  systemLogs.push({
    id: seqId++,
    time: new Date().toISOString(),
    type,
    msg: safeMsg,
    meta: safeMeta,
  });
  if (systemLogs.length > MAX_LOG_ENTRIES) systemLogs.shift();

  const color = type === 'ERROR'
    ? 'color: #ef4444'
    : type === 'WARN'
    ? 'color: #f59e0b'
    : type === 'WA'
    ? 'color: #10b981'
    : 'color: #33b5e5';
  const consoleText = safeMeta ? `${safeMsg} | ${safeMeta}` : safeMsg;
  console.log(`%c[${type}] ${new Date().toLocaleTimeString()}: ${consoleText}`, color);
  notifyListeners();
};

export const getSystemLogs = (): SystemLogEntry[] => [...systemLogs];

export const clearSystemLogs = () => {
  systemLogs.length = 0;
  addLog(`Log buffer cleared (v${APP_VERSION})`, 'INFO');
};

export const subscribeSystemLogs = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const installGlobalErrorListeners = () => {
  if (globalErrorsInstalled || typeof window === 'undefined') return;
  globalErrorsInstalled = true;

  window.addEventListener('error', (event) => {
    addLog(`Uncaught Error: ${event.message || 'Unknown error'}`, 'ERROR', {
      source: event.filename ? event.filename.split('/').slice(-2).join('/') : undefined,
      line: event.lineno,
      col: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? `${event.reason.name}: ${event.reason.message}`
      : String(event.reason || 'Unknown rejection');
    addLog(`Unhandled Promise Rejection: ${reason}`, 'ERROR');
  });
};

export const buildDiagnosticReport = (): string => {
  const snap = telemetryProvider ? telemetryProvider() : {};
  const counts: Record<string, number> = {};
  systemLogs.forEach((l) => { counts[l.type] = (counts[l.type] || 0) + 1; });

  const headerLines = [
    '=== TeamPlaner Diagnostics Report ===',
    `ExportedAt: ${new Date().toISOString()}`,
    `AppVersion: v${APP_VERSION}`,
    `Route: ${typeof window !== 'undefined' ? (window.location.hash || window.location.pathname) : 'n/a'}`,
    `Online: ${typeof navigator !== 'undefined' ? String(navigator.onLine) : 'n/a'}`,
    `Viewport: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'n/a'}`,
    `Telemetry: ${JSON.stringify(snap)}`,
    `LogCounts: total=${systemLogs.length} ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`,
    '=== Timeline ===',
  ];

  const bodyLines = systemLogs.map((l) =>
    `[${l.time}] [${l.type}] ${l.msg}${l.meta ? ` | ${l.meta}` : ''}`
  );
  return [...headerLines, ...bodyLines].join('\n');
};

export const downloadSystemLogs = () => {
  const report = buildDiagnosticReport();
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `etgarim-system-${new Date().toISOString().slice(0, 10)}.log`;
  a.click();
  addLog('Exported diagnostic .log report', 'INFO', { entries: systemLogs.length });
};

export const copySystemLogs = async (): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(buildDiagnosticReport());
    addLog('Copied diagnostic report to clipboard', 'INFO', { entries: systemLogs.length });
    return true;
  } catch {
    return false;
  }
};
