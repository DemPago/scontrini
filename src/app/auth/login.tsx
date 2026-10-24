import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
      if (result.type !== 'success') return;

      const { data: authData, error: exchError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchError) throw exchError;

      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', authData.session!.user.id).maybeSingle();
      router.replace(profile ? '/' : '/auth/profile-setup');
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🧾</Text>
        <Text style={styles.title}>Scontrini</Text>
        <Text style={styles.sub}>Accedi per gestire le tue note spese</Text>

        <TouchableOpacity style={[styles.googleBtn, loading && styles.googleBtnDisabled]} onPress={signInWithGoogle} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#444" size="small" />
            : <>
                <View style={styles.googleLogo}>
                  <Text style={[styles.g, { color: '#4285F4' }]}>G</Text>
                  <Text style={[styles.g, { color: '#EA4335' }]}>o</Text>
                  <Text style={[styles.g, { color: '#FBBC05' }]}>o</Text>
                  <Text style={[styles.g, { color: '#4285F4' }]}>g</Text>
                  <Text style={[styles.g, { color: '#34A853' }]}>l</Text>
                  <Text style={[styles.g, { color: '#EA4335' }]}>e</Text>
                </View>
                <Text style={styles.googleText}>Accedi con Google</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f2f2f7' },
  inner:            { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  logo:             { fontSize: 64, marginBottom: 8 },
  title:            { fontSize: 30, fontWeight: '700', marginBottom: 8 },
  sub:              { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 48, lineHeight: 22 },
  googleBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, gap: 10,
                      borderWidth: 1, borderColor: '#ddd',
                      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                      elevation: 2, minWidth: 240, justifyContent: 'center' },
  googleBtnDisabled:{ opacity: 0.6 },
  googleLogo:       { flexDirection: 'row' },
  g:                { fontSize: 16, fontWeight: '700' },
  googleText:       { fontSize: 16, fontWeight: '600', color: '#3c4043', letterSpacing: 0.2 },
});
