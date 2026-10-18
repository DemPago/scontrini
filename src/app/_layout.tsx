import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { getUser } from '../lib/user';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getUser().then(user => {
      if (!user) router.replace('/onboarding');
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#f2f2f7' }} />;

  return (
    <Stack>
      <Stack.Screen name="index"       options={{ title: 'Trasferte' }} />
      <Stack.Screen name="trip/[id]"   options={{ title: 'Spese' }} />
      <Stack.Screen name="trip/add"    options={{ title: 'Nuova trasferta', presentation: 'modal' }} />
      <Stack.Screen name="expense/add" options={{ title: 'Aggiungi spesa', presentation: 'modal' }} />
      <Stack.Screen name="export/[id]" options={{ title: 'Esporta' }} />
      <Stack.Screen name="onboarding"  options={{ headerShown: false }} />
    </Stack>
  );
}
