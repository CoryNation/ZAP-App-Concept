'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else {
        setEmail(data.session.user.email ?? null);
        setReady(true);
      }
    });
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  // --- AI Showcase (mock) ---
  const next7 = [
    { day: 'Thu', units: 1180 },
    { day: 'Fri', units: 1205 },
    { day: 'Sat', units: 990 },
    { day: 'Sun', units: 1010 },
    { day: 'Mon', units: 1230 },
    { day: 'Tue', units: 1265 },
    { day: 'Wed', units: 1275 }
  ];
  const forecast = next7.map(x => x.units).join(' • ');

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>ZAP App</h1>
      <p>Signed in as {email}</p>

      <nav style={{ margin: '12px 0' }}>
        <a href="/me" style={{ marginRight: 12 }}>My Profile</a>
        <a href="/work-requests" style={{ marginRight: 12 }}>Work Requests</a>
        <a href="/inventory">Inventory</a>
      </nav>

      {/* AI Insight card (non-functional mock to demo vision) */}
      <section style={{ border: '1px solid #ddd', padding: 12, marginTop: 12, maxWidth: 640 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>AI Insight — Predictive Production (Demo)</div>
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          Next 7 days (units): {forecast}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Top driver: Planned maintenance on Line A (Sat/Sun)</li>
          <li>Watchlist: Weld spatter recurrence risk on M‑101</li>
          <li>Suggestion: Pre-stage slit coil for Mon–Wed demand</li>
        </ul>
      </section>

      <button onClick={signOut} style={{ marginTop: 16, padding: '8px 12px' }}>
        Sign out
      </button>
    </main>
  );
}
