'use client';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Me() {
  const router = useRouter();
  const [email, setEmail] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setEmail(session.user.email ?? null);

      const { data } = await supabase
        .from('profiles')
        .select('company_id,factory_id,role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setProfile(data ?? null);
    })();
  }, [router]);

  if (!email) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22 }}>My Profile</h1>
      <p>Email: {email}</p>
      <pre style={{ background: '#f4f4f4', padding: 12, marginTop: 12 }}>
        {JSON.stringify(profile, null, 2)}
      </pre>
    </main>
  );
}
