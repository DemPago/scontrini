import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter, useNavigation } from 'expo-router';
import { supabase, Trip } from '../lib/supabase';
import { getUser, ownerKey, UserProfile } from '../lib/user';

export default function TripsScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const [trips, setTrips]   = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser]     = useState<UserProfile | null>(null);

  useLayoutEffect(() => {
    if (!user) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.nome[0]}{user.cognome[0]}</Text>
        </View>
      ),
    });
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const u = await getUser();
    setUser(u);
    const owner = u ? ownerKey(u) : '';
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('owner', owner)
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Errore', error.message);
    else setTrips(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const deleteTrip = (trip: Trip) => {
    Alert.alert('Elimina trasferta', `Eliminare "${trip.name}" e tutte le sue spese?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          const { data: expenses } = await supabase
            .from('expenses').select('receipt_path').eq('trip_id', trip.id);
          const paths = (expenses ?? []).map(e => e.receipt_path).filter(Boolean) as string[];
          if (paths.length > 0) await supabase.storage.from('receipts').remove(paths);
          await supabase.from('expenses').delete().eq('trip_id', trip.id);
          await supabase.from('trips').delete().eq('id', trip.id);
          load();
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#007AFF" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          user ? (
            <View style={styles.greeting}>
              <Text style={styles.greetingHello}>Ciao, {user.nome} 👋</Text>
              <Text style={styles.greetingCount}>
                {trips.length === 0
                  ? 'Nessuna trasferta ancora'
                  : `${trips.length} trasfert${trips.length === 1 ? 'a' : 'e'}`}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Premi + per creare la prima trasferta.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id, name: item.name } })}
            onLongPress={() => deleteTrip(item)}
          >
            <Text style={styles.cardEmoji}>{item.status === 'closed' ? '🔒' : '✈️'}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardDate}>{item.created_at.split('T')[0]}</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/trip/add')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f2f2f7' },
  center:        { flex: 1, justifyContent: 'center' },
  greeting:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  greetingHello: { fontSize: 22, fontWeight: '700', color: '#1c1c1e' },
  greetingCount: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  avatar:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  avatarText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 16 },
  cardEmoji:     { fontSize: 28, marginRight: 12 },
  cardBody:      { flex: 1 },
  cardName:      { fontSize: 16, fontWeight: '600' },
  cardDate:      { fontSize: 12, color: '#888', marginTop: 2 },
  cardArrow:     { fontSize: 22, color: '#ccc' },
  empty:         { textAlign: 'center', color: '#aaa', marginTop: 60, lineHeight: 24 },
  fab:           { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  fabText:       { color: '#fff', fontSize: 26, lineHeight: 30 },
});
