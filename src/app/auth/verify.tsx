import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [token, setToken]   = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (token.length !== 6) { Alert.alert('Codice non valido', 'Inserisci il codice a 6 cifre.'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) { Alert.alert('Codice errato', error.message); setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('id', data.user!.id).maybeSingle();
    setLoading(false);
    router.replace(profile ? '/' : '/auth/profile-setup');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>📬</Text>
        <Text style={styles.title}>Controlla la mail</Text>
        <Text style={styles.sub}>Abbiamo inviato un codice a{'\n'}<Text style={styles.email}>{email}</Text></Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          placeholder="000000"
          textAlign="center"
          returnKeyType="done"
          onSubmitEditing={verify}
        />
        <TouchableOpacity style={styles.btn} onPress={verify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verifica</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  inner:     { flex: 1, justifyContent: 'center', padding: 32 },
  logo:      { fontSize: 60, textAlign: 'center', marginBottom: 8 },
  title:     { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub:       { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  email:     { fontWeight: '600', color: '#007AFF' },
  input:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 32, letterSpacing: 8, marginBottom: 16, textAlign: 'center' },
  btn:       { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
});
