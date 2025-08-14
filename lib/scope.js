// lib/scope.js
'use client';

import { useEffect, useState } from 'react';

/**
 * Global Factory/Line selection persisted in localStorage.
 * Shape: { factoryId: string|null, lineId: string|null }
 */
const KEY = 'zap.scope';

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

export function getScope() {
  if (typeof window === 'undefined') return { factoryId: null, lineId: null };
  const raw = localStorage.getItem(KEY);
  const val = safeParse(raw, {});
  return {
    factoryId: val?.factoryId ?? null,
    lineId: val?.lineId ?? null,
  };
}

/** Merge + persist and notify listeners (all tabs). */
export function setScope(update) {
  if (typeof window === 'undefined') return;
  const cur = getScope();
  const next = { ...cur, ...update };
  localStorage.setItem(KEY, JSON.stringify(next));
  // intra‑tab listeners
  window.dispatchEvent(new Event('zap-scope-change'));
}

/** Reset to (All). */
export function resetScope() {
  setScope({ factoryId: null, lineId: null });
}

/** React hook: subscribes to changes across tabs/windows. */
export function useScope() {
  const [scope, set] = useState(getScope());

  useEffect(() => {
    const onChange = () => set(getScope());
    window.addEventListener('zap-scope-change', onChange);
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) onChange();
    });
    return () => {
      window.removeEventListener('zap-scope-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return [scope, setScope, resetScope];
}
