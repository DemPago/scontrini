import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index"           options={{ title: 'Trasferte' }} />
      <Stack.Screen name="trip/[id]"       options={{ title: 'Spese' }} />
      <Stack.Screen name="trip/add"        options={{ title: 'Nuova trasferta', presentation: 'modal' }} />
      <Stack.Screen name="expense/add"     options={{ title: 'Aggiungi spesa', presentation: 'modal' }} />
      <Stack.Screen name="export/[id]"     options={{ title: 'Esporta' }} />
    </Stack>
  );
}
