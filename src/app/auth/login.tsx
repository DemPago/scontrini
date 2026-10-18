import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!e) { Alert.alert('Email mancante', 'Inserisci la tua email.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: 'scontrini://' },
    });
    setLoading(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.logo}>📬</Text>
          <Text style={styles.title}>Controlla la mail</Text>
          <Text style={styles.sub}>Abbiamo inviato un link a{'\n'}<Text style={styles.accent}>{email.trim().toLowerCase()}</Text>{'\n\n'}Clicca il link nell'email — l'app si aprirà automaticamente.</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setSent(false)}>
            <Text style={styles.btnSecondaryText}>Cambia email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🧾</Text>
        <Text style={styles.title}>Scontrini</Text>
        <Text style={styles.sub}>Inserisci la tua email per accedere</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
          placeholder="tua@email.it"
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <TouchableOpacity style={styles.btn} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Invia link</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f2f2f7' },
  inner:          { flex: 1, justifyContent: 'center', padding: 32 },
  logo:           { fontSize: 60, textAlign: 'center', marginBottom: 8 },
  title:          { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub:            { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  accent:         { fontWeight: '600', color: '#007AFF' },
  input:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  btn:            { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:        { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnSecondary:   { marginTop: 16, padding: 12, alignItems: 'center' },
  btnSecondaryText:{ color: '#007AFF', fontSize: 15 },
});
