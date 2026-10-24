import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [nome, setNome]       = useState('');
  const [cognome, setCognome] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const full = user.user_metadata?.full_name as string | undefined;
      if (full) {
        const parts = full.trim().split(' ');
        setNome(parts[0] ?? '');
        setCognome(parts.slice(1).join(' ') ?? '');
      }
    });
  }, []);

  const save = async () => {
    if (!nome.trim() || !cognome.trim()) { Alert.alert('Dati mancanti', 'Inserisci nome e cognome.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Errore', 'Utente non trovato.'); setSaving(false); return; }

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      nome: nome.trim(),
      cognome: cognome.trim(),
    });
    setSaving(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <Text style={styles.logo}>👤</Text>
        <Text style={styles.title}>Il tuo profilo</Text>
        <Text style={styles.sub}>Come ti chiami? Verrà usato per il nome dei file Excel.</Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} autoFocus placeholder="Demetrio" />

        <Text style={styles.label}>Cognome</Text>
        <TextInput style={styles.input} value={cognome} onChangeText={setCognome} placeholder="Ferraro" returnKeyType="done" onSubmitEditing={save} />

        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continua</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  inner:     { padding: 32, paddingTop: 80 },
  logo:      { fontSize: 60, textAlign: 'center', marginBottom: 8 },
  title:     { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub:       { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  label:     { fontSize: 13, color: '#666', marginBottom: 8, marginTop: 16 },
  input:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16 },
  btn:       { marginTop: 32, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
});
