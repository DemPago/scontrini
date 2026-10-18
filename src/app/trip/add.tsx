import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);
}

export default function NewTripScreen() {
  const router        = useRouter();
  const [name, setName]   = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) { Alert.alert('Nome mancante', 'Inserisci un nome per la trasferta.'); return; }
    setSaving(true);

    const slug = toSlug(name);
    const { error } = await supabase.from('trips').insert({ name: name.trim(), slug });

    setSaving(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome trasferta</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Es: Milano 18-19 ott"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
      />
      <Text style={styles.hint}>Verrà usato come nome cartella per gli scontrini.</Text>

      <TouchableOpacity style={styles.btn} onPress={create} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crea trasferta</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 20 },
  label:     { fontSize: 13, color: '#666', marginBottom: 8 },
  input:     { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 17 },
  hint:      { fontSize: 12, color: '#aaa', marginTop: 8 },
  btn:       { marginTop: 32, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
});
