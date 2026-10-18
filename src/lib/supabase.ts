import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Category = 'pranzo' | 'cena' | 'trasporto' | 'hotel' | 'altro';

export const CATEGORIES: Category[] = ['pranzo', 'cena', 'trasporto', 'hotel', 'altro'];

export const OWNER    = 'demetrio';
export const SURNAME  = 'Ferraro';
export const COMPANY  = 'WaveByVento';

export interface Trip {
  id: string;
  created_at: string;
  name: string;
  slug: string;
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
