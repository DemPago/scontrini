import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveUser } from '../lib/user';

export default function OnboardingScreen() {
  const router = useRouter();
  const [nome, setNome]       = useState('');
  const [cognome, setCognome] = useState('');
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!nome.trim() || !cognome.trim()) {
      Alert.alert('Dati mancanti', 'Inserisci nome e cognome.');
      return;
    }
    setSaving(true);
    await saveUser({ nome: nome.trim(), cognome: cognome.trim() });
    setSaving(false);
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <Text style={styles.logo}>🧾</Text>
        <Text style={styles.title}>Benvenuto</Text>
        <Text style={styles.sub}>Come ti chiami? Verrà usato per le tue trasferte e il nome dei file Excel.</Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          autoFocus
          placeholder="Demetrio"
          returnKeyType="next"
        />

        <Text style={styles.label}>Cognome</Text>
        <TextInput
          style={styles.input}
          value={cognome}
          onChangeText={setCognome}
          placeholder="Ferraro"
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>I tuoi file si chiameranno:</Text>
          <Text style={styles.previewName}>
            {(cognome.trim() || 'Cognome')}_{(nome.trim() || 'Nome')}_Luogo_2026_10.xlsx
          </Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Inizia</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f2f2f7' },
  inner:       { padding: 32, paddingTop: 80 },
  logo:        { fontSize: 60, textAlign: 'center', marginBottom: 8 },
  title:       { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub:         { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  label:       { fontSize: 13, color: '#666', marginBottom: 8, marginTop: 16 },
  input:       { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16 },
  previewBox:  { marginTop: 24, backgroundColor: '#e8f4fd', borderRadius: 10, padding: 14 },
  previewLabel:{ fontSize: 12, color: '#555', marginBottom: 4 },
  previewName: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  btn:         { marginTop: 32, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
});
