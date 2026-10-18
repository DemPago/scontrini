import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Category = 'pranzo' | 'cena' | 'trasporto' | 'hotel' | 'altro';
export const CATEGORIES: Category[] = ['pranzo', 'cena', 'trasporto', 'hotel', 'altro'];

export const OWNER   = 'demetrio';
export const SURNAME = 'Ferraro';

export interface Trip {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  location: string;
  year: number;
  month: number;
  event_name: string | null;
  status: 'open' | 'closed';
  excel_url: string | null;
}

export interface Expense {
  id: string;
  created_at: string;
  trip_id: string;
  date: string;
  amount: number;
  category: Category;
  notes: string;
  receipt_url: string | null;
  receipt_path: string | null;
}

export function tripLabel(t: Pick<Trip, 'location' | 'year' | 'month' | 'event_name'>): string {
  const m = String(t.month).padStart(2, '0');
  const parts = [t.location, `${t.year}`, m];
  if (t.event_name) parts.push(t.event_name);
  return parts.join('_');
}

export function tripFileName(t: Pick<Trip, 'location' | 'year' | 'month' | 'event_name'>, cognome?: string): string {
  return `${cognome ?? SURNAME}_${tripLabel(t)}.xlsx`;
}
