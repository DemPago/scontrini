import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  nome: string;
  cognome: string;
}

export async function getUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('nome, cognome').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  return { id: user.id, nome: profile.nome, cognome: profile.cognome };
}

export function ownerKey(profile: UserProfile): string {
  return profile.id;
}
