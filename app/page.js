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

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>ZAP App</h1>
      <p>Signed in as {email}</p>
      <a href="/me" style={{ display: 'inline-block', marginTop: 8 }}>Go to My Profile</a>
      <div>
        <button onClick={signOut} style={{ marginTop: 12, padding: '8px 12px' }}>Sign out</button>
      </div>
    </main>
  );
}
