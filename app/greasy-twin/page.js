'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// NOTE: relative import (no "@/")
import { supabase } from '../../lib/supabaseClient';

export default function GreasyTwin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);
      await refresh();
    })();
  }, [router]);

  async function refresh() {
    // Load bearings with machine info
    const { data: bearings, error: bErr } = await supabase
      .from('bearings')
      .select('id,label,machine_id,machines:machine_id (asset_number,name)')
      .order('label');
    if (bErr) {
      alert('Load bearings error: ' + bErr.message);
      return;
    }
    if (!bearings || bearings.length === 0) {
      setRows([]);
      return;
    }

    const ids = bearings.map(b => b.id);
    const { data: readings, error: rErr } = await supabase
      .from('grease_readings')
      .select('id,bearing_id,frequency_hz,status,last_greased_date,next_grease_due_date,created_at')
      .in('bearing_id', ids)
      .order('created_at', { ascending: false });
    if (rErr) {
      alert('Load readings error: ' + rErr.message);
      return;
    }

    const latest = new Map();
    (readings || []).forEach(r => {
      if (!latest.has(r.bearing_id)) latest.set(r.bearing_id, r);
    });

    setRows(bearings.map(b => ({
      bearing_id: b.id,
      label: b.label,
      machine: b.machines?.asset_number ? `${b.machines.asset_number} — ${b.machines.name || 'Machine'}` : '',
      reading: latest.get(b.id) || null
    })));
  }

  async function simulateGrease(bearing_id) {
    if (busy) return;
    setBusy(true);
    try {
      const current = rows.find(r => r.bearing_id === bearing_id)?.reading?.status || 'needs_grease';
      const next = current === 'needs_grease' ? 'greased' : 'needs_grease';
      const body = {
        bearing_id,
        frequency_hz: next === 'greased' ? 180 : 420,
        status: next, // enum on server; acceptable via supabase-js
        last_greased_date: next === 'greased' ? new Date().toISOString().slice(0,10) : null,
        next_grease_due_date: next === 'greased'
          ? new Date(Date.now() + 1000*60*60*24*10).toISOString().slice(0,10)
          : new Date(Date.now() + 1000*60*60*24*7).toISOString().slice(0,10)
      };
      const { error } = await supabase.from('grease_readings').insert([body]);
      if (error) throw new Error(error.message);
      await refresh();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <main style={{ padding: 16, maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Greasy Twin (Demo)</h1>
      <p style={{ marginBottom: 12 }}>
        Click “Simulate Reading” to flip a bearing between <em>Needs Grease</em> and <em>Greased</em>.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
        <div>Bearing</div><div>Machine</div><div>Status</div><div>Freq (Hz)</div><div>Actions</div>
      </div>

      {rows.length === 0 && (
        <div style={{ padding: '12px 0' }}>
          No bearings yet. Make sure you seeded M‑101 plus “Bearing A/B”, or add a bearing tied to a machine.
        </div>
      )}

      {rows.map(r => (
        <div key={r.bearing_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f1f1' }}>
          <div>{r.label}</div>
          <div>{r.machine}</div>
          <div style={{ color: r.reading?.status === 'needs_grease' ? '#b51e27' : 'green', fontWeight: 600 }}>
            {r.reading?.status || '—'}
          </div>
          <div>{r.reading?.frequency_hz ?? '—'}</div>
          <div>
            <button onClick={() => simulateGrease(r.bearing_id)} disabled={busy} style={{ padding: '6px 10px' }}>
              {busy ? 'Working…' : 'Simulate Reading'}
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
