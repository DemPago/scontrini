import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const code = params.code as string | undefined;
    if (!code) { router.replace('/auth/login'); return; }

    supabase.auth.exchangeCodeForSession(
      `${window.location?.href ?? ''}` || `scontrini://auth/callback?code=${code}`
    ).then(async ({ data, error }) => {
      if (error || !data.session) { router.replace('/auth/login'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', data.session.user.id).maybeSingle();
      router.replace(profile ? '/' : '/auth/profile-setup');
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f7' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
