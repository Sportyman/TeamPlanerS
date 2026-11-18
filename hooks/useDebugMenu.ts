import { useEffect, useMemo, useState } from 'react';
import {
  addLog, clearSystemLogs, copySystemLogs, downloadSystemLogs,
  getSystemLogs, subscribeSystemLogs, SystemLogEntry,
} from '../services/logging/systemLogger';

export type DebugLogFilter = 'ALL' | 'ISSUES' | 'WA';

export const useDebugMenu = (isOpen: boolean) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>(() => getSystemLogs());
  const [filter, setFilter] = useState<DebugLogFilter>('ALL');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLogs(getSystemLogs());
    return subscribeSystemLogs(() => setLogs(getSystemLogs()));
  }, [isOpen]);

  const stats = useMemo(() => {
    let errors = 0;
    let warns = 0;
    logs.forEach((l) => {
      if (l.type === 'ERROR') errors++;
      else if (l.type === 'WARN') warns++;
    });
    return { total: logs.length, errors, warns };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const base = filter === 'ISSUES'
      ? logs.filter((l) => l.type === 'ERROR' || l.type === 'WARN')
      : filter === 'WA'
      ? logs.filter((l) => l.type === 'WA' || l.type === 'ERROR' || l.type === 'WARN')
      : logs;
    return base.slice(-25).reverse();
  }, [logs, filter]);

  const handleCopy = async () => {
    const ok = await copySystemLogs();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleAddMarker = () => {
    addLog('Diagnostic checkpoint marked by administrator', 'INFO');
  };

  return {
    stats,
    filteredLogs,
    filter,
    setFilter,
    copied,
    downloadLogs: downloadSystemLogs,
    copyLogs: handleCopy,
    clearLogs: clearSystemLogs,
    addMarker: handleAddMarker,
  };
};
