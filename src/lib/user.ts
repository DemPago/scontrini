import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  nome: string;
  cognome: string;
}

const KEY = 'user_profile';

export async function getUser(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveUser(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

export function ownerKey(profile: UserProfile): string {
  return `${profile.nome}_${profile.cognome}`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
