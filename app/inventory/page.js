'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Inventory() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    material_id: '',
    material_state: 'raw_coil',
    quantity: '',
    unit_of_measure: 'tons',
    line_id: ''
  });
  const [lines, setLines] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);

      await Promise.all([refresh(), loadLines()]);
    })();
  }, [router]);

  async function refresh() {
    const { data } = await supabase
      .from('inventory')
      .select('id, material_id, material_state, quantity, unit_of_measure, last_updated')
      .order('last_updated', { ascending: false });
    setRows(data ?? []);
  }

  async function loadLines() {
    const { data } = await supabase
      .from('lines')
      .select('id, name')
      .order('name', { ascending: true });
    setLines(data ?? []);
  }

  const grouped = useMemo(() => {
    const g = { raw_coil: [], slit_coil: [], wip: [], finished: [] };
    for (const r of rows) g[r.material_state]?.push(r);
    return g;
  }, [rows]);

  const totals = useMemo(() => {
    const t = { raw_coil: 0, slit_coil: 0, wip: 0, finished: 0 };
    for (const r of rows) t[r.material_state] += Number(r.quantity || 0);
    return t;
  }, [rows]);

  async function createItem(e) {
    e.preventDefault();
    if (!form.material_id || !form.quantity) return;

    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id,factory_id')
      .eq('user_id', session.user.id)
      .single();

    const { error } = await supabase.from('inventory').insert([{
      company_id: profile.company_id,
      factory_id: profile.factory_id,
      line_id: form.line_id || null,
      material_id: form.material_id,
      material_state: form.material_state,
      quantity: Number(form.quantity),
      unit_of_measure: form.unit_of_measure
    }]);

    if (error) return alert(error.message);
    setForm({ material_id: '', material_state: 'raw_coil', quantity: '', unit_of_measure: 'tons', line_id: '' });
    await refresh();
  }

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <main style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Inventory</h1>

      <form onSubmit={createItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        <input
          placeholder="Material ID"
          value={form.material_id}
          onChange={(e) => setForm(f => ({ ...f, material_id: e.target.value }))}
          style={{ padding: 8 }}
        />
        <select
          value={form.material_state}
          onChange={(e) => setForm(f => ({ ...f, material_state: e.target.value }))}
          style={{ padding: 8 }}
        >
          <option value="raw_coil">Raw Coil</option>
          <option value="slit_coil">Slit Coil</option>
          <option value="wip">WIP</option>
          <option value="finished">Finished</option>
        </select>
        <input
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}
          style={{ padding: 8 }}
        />
        <input
          placeholder="UoM (e.g., tons, ft)"
          value={form.unit_of_measure}
          onChange={(e) => setForm(f => ({ ...f, unit_of_measure: e.target.value }))}
          style={{ padding: 8 }}
        />
        <select
          value={form.line_id}
          onChange={(e) => setForm(f => ({ ...f, line_id: e.target.value }))}
          style={{ padding: 8 }}
        >
          <option value="">(optional) Line…</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button type="submit" style={{ gridColumn: 'span 5', padding: '8px 12px' }}>Add Inventory Item</button>
      </form>

      {['raw_coil','slit_coil','wip','finished'].map(state => (
        <section key={state} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>
            {state.replace('_',' ').toUpperCase()} — Total: {totals[state]}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Material</div>
            <div style={{ fontWeight: 600 }}>Qty</div>
            <div style={{ fontWeight: 600 }}>UoM</div>
            <div style={{ fontWeight: 600 }}>Last Updated</div>
            {(grouped[state] || []).map(r => (
              <>
                <div>{r.material_id}</div>
                <div>{r.quantity}</div>
                <div>{r.unit_of_measure}</div>
                <div>{new Date(r.last_updated).toLocaleString()}</div>
              </>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
