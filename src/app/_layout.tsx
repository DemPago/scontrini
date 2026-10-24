import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setRedirectTo('/auth/login');
      } else {
        const { data: profile } = await supabase
          .from('profiles').select('id').eq('id', session.user.id).maybeSingle();
        setRedirectTo(profile ? '/' : '/auth/profile-setup');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setRedirectTo('/auth/login');
      else setRedirectTo('/');
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo as any);
  }, [redirectTo]);

  if (!redirectTo) return <View style={{ flex: 1, backgroundColor: '#f2f2f7' }} />;

  return (
    <Stack>
      <Stack.Screen name="index"              options={{ title: 'Trasferte' }} />
      <Stack.Screen name="trip/[id]"          options={{ title: 'Spese' }} />
      <Stack.Screen name="trip/add"           options={{ title: 'Nuova trasferta', presentation: 'modal' }} />
      <Stack.Screen name="expense/add"        options={{ title: 'Aggiungi spesa', presentation: 'modal' }} />
      <Stack.Screen name="export/[id]"        options={{ title: 'Esporta' }} />
      <Stack.Screen name="auth/login"         options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback"      options={{ headerShown: false }} />
      <Stack.Screen name="auth/profile-setup" options={{ headerShown: false }} />
    </Stack>
  );
}
