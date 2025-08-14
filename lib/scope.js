// lib/scope.js
'use client';
import { useEffect, useState } from 'react';

const KEY = 'zap.scope'; // { factoryId: string|null, lineId: string|null }

export function getScope() {
  if (typeof window === 'undefined') return { factoryId: null, lineId: null };
  try {
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : { factoryId: null, lineId: null };
  } catch {
    return { factoryId: null, lineId: null };
  }
}

export function setScope(update) {
  if (typeof window === 'undefined') return;
  const cur = getScope();
  const next = { ...cur, ...update };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('zap-scope-change'));
}

export function useScope() {
  const [scope, set] = useState(getScope());
  useEffect(() => {
    const onChange = () => set(getScope());
    window.addEventListener('zap-scope-change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('zap-scope-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return [scope, setScope];
}
