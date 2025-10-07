import { supabase } from '@/lib/supabaseClient';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  impact_score: number; // 1-5
  effort_score: number; // 1-5
  status: 'Draft' | 'Proposed' | 'Approved' | 'In-Progress' | 'Done';
  created_at: string;
  created_by?: string;
}

export interface CreateIdeaInput {
  title: string;
  description?: string;
  impact_score: number;
  effort_score: number;
  status: 'Draft' | 'Proposed' | 'Approved' | 'In-Progress' | 'Done';
}

export interface UpdateIdeaInput {
  id: string;
  title?: string;
  description?: string;
  impact_score?: number;
  effort_score?: number;
  status?: 'Draft' | 'Proposed' | 'Approved' | 'In-Progress' | 'Done';
}

// In-memory fallback store
let inMemoryIdeas: Idea[] = [
  {
    id: 'demo-1',
    title: 'Automated Seam Welder Calibration',
    description: 'Use vision system to auto-calibrate weld parameters and reduce setup time.',
    impact_score: 5,
    effort_score: 3,
    status: 'Proposed',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'j.smith@example.com',
  },
  {
    id: 'demo-2',
    title: 'SMED Kit Prep Station',
    description: 'Pre-stage changeover tools and materials to reduce downtime by 20 minutes per shift.',
    impact_score: 4,
    effort_score: 2,
    status: 'In-Progress',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'm.jones@example.com',
  },
  {
    id: 'demo-3',
    title: 'Real-time OD Gauge Dashboard',
    description: 'Display live OD measurements on shop floor screens to catch drift early.',
    impact_score: 3,
    effort_score: 2,
    status: 'Approved',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'a.garcia@example.com',
  },
];

let useInMemory = false;

/**
 * List all ideas
 */
export async function listIdeas(): Promise<Idea[]> {
  if (useInMemory) {
    return [...inMemoryIdeas].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  try {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.warn('Failed to fetch ideas from Supabase, using in-memory fallback:', err);
    useInMemory = true;
    return [...inMemoryIdeas].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
}

/**
 * Create a new idea
 */
export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const newIdea: Idea = {
    id: generateId(),
    ...input,
    created_at: new Date().toISOString(),
    created_by: 'current_user@example.com', // Mock for now
  };

  if (useInMemory) {
    inMemoryIdeas.push(newIdea);
    return newIdea;
  }

  try {
    const { data, error } = await supabase
      .from('ideas')
      .insert([newIdea])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    console.warn('Failed to create idea in Supabase, using in-memory fallback:', err);
    useInMemory = true;
    inMemoryIdeas.push(newIdea);
    return newIdea;
  }
}

/**
 * Update an existing idea
 */
export async function updateIdea(input: UpdateIdeaInput): Promise<Idea> {
  if (useInMemory) {
    const index = inMemoryIdeas.findIndex((i) => i.id === input.id);
    if (index === -1) {
      throw new Error('Idea not found');
    }
    inMemoryIdeas[index] = {
      ...inMemoryIdeas[index],
      ...input,
    };
    return inMemoryIdeas[index];
  }

  try {
    const { id, ...updates } = input;
    const { data, error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    console.warn('Failed to update idea in Supabase, using in-memory fallback:', err);
    useInMemory = true;
    const index = inMemoryIdeas.findIndex((i) => i.id === input.id);
    if (index === -1) {
      throw new Error('Idea not found');
    }
    inMemoryIdeas[index] = {
      ...inMemoryIdeas[index],
      ...input,
    };
    return inMemoryIdeas[index];
  }
}

/**
 * Generate a unique ID for in-memory storage
 */
function generateId(): string {
  return `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

