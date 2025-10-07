import { supabase } from '@/lib/supabaseClient';

export interface Win {
  id: string;
  title: string;
  kpi_delta?: number;
  evidence_url?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateWinInput {
  title: string;
  kpi_delta?: number;
  evidence_url?: string;
}

// In-memory fallback store
let inMemoryWins: Win[] = [
  {
    id: 'win-demo-1',
    title: 'Line B achieved 95% uptime for 30 consecutive days',
    kpi_delta: 15,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'ops.manager@example.com',
  },
  {
    id: 'win-demo-2',
    title: 'Zero safety incidents across all shifts in Q3',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'safety.lead@example.com',
  },
  {
    id: 'win-demo-3',
    title: 'Reduced changeover time by 25% with new SMED process',
    kpi_delta: 25,
    evidence_url: 'https://example.com/smed-report',
    created_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'production.supervisor@example.com',
  },
];

let useInMemory = false;

/**
 * List all wins
 */
export async function listWins(): Promise<Win[]> {
  if (useInMemory) {
    return [...inMemoryWins].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  try {
    const { data, error } = await supabase
      .from('wins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.warn('Failed to fetch wins from Supabase, using in-memory fallback:', err);
    useInMemory = true;
    return [...inMemoryWins].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
}

/**
 * Create a new win
 */
export async function createWin(input: CreateWinInput): Promise<Win> {
  const newWin: Win = {
    id: generateId(),
    ...input,
    created_at: new Date().toISOString(),
    created_by: 'current_user@example.com', // Mock for now
  };

  if (useInMemory) {
    inMemoryWins.unshift(newWin);
    return newWin;
  }

  try {
    const { data, error } = await supabase
      .from('wins')
      .insert([newWin])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    console.warn('Failed to create win in Supabase, using in-memory fallback:', err);
    useInMemory = true;
    inMemoryWins.unshift(newWin);
    return newWin;
  }
}

/**
 * Generate a unique ID for in-memory storage
 */
function generateId(): string {
  return `win-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

