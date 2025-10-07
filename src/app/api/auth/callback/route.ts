import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        // Redirect to login with error
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
      }

      // Successful authentication - redirect to home
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin));
    }
  }

  // No code present, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

