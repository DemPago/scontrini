import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index"  options={{ title: 'Le mie spese' }} />
      <Stack.Screen name="add"    options={{ title: 'Aggiungi spesa', presentation: 'modal' }} />
      <Stack.Screen name="export" options={{ title: 'Esporta' }} />
    </Stack>
  );
}
