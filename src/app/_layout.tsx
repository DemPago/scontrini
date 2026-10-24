import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/login');
      } else {
        const { data: profile } = await supabase
          .from('profiles').select('id').eq('id', session.user.id).maybeSingle();
        if (!profile) router.replace('/auth/profile-setup');
      }
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth/login');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#f2f2f7' }} />;

  return (
    <Stack>
      <Stack.Screen name="index"              options={{ title: 'Trasferte' }} />
      <Stack.Screen name="trip/[id]"          options={{ title: 'Spese' }} />
      <Stack.Screen name="trip/add"           options={{ title: 'Nuova trasferta', presentation: 'modal' }} />
      <Stack.Screen name="expense/add"        options={{ title: 'Aggiungi spesa', presentation: 'modal' }} />
      <Stack.Screen name="export/[id]"        options={{ title: 'Esporta' }} />
      <Stack.Screen name="auth/login"         options={{ headerShown: false }} />
      <Stack.Screen name="auth/verify"        options={{ headerShown: false }} />
      <Stack.Screen name="auth/profile-setup" options={{ headerShown: false }} />
    </Stack>
  );
}
