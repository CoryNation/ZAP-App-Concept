'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace('/');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Sign in</h1>
      <Auth supabaseClient={supabase} magicLink providers={[]} onlyThirdPartyProviders={false} />
    </div>
  );
}
