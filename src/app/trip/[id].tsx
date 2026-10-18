import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { supabase, Expense } from '../../lib/supabase';

const CATEGORY_EMOJI: Record<string, string> = {
  pranzo: '🍝', cena: '🍷', trasporto: '🚆', hotel: '🏨', altro: '📎',
};

export default function TripScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router       = useRouter();
  const navigation   = useNavigation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: name ?? 'Spese' });
  }, [name]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', id)
      .order('date', { ascending: false });
    if (error) Alert.alert('Errore', error.message);
    else {
      setExpenses(data ?? []);
      setTotal((data ?? []).reduce((s, e) => s + Number(e.amount), 0));
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const deleteExpense = (expense: Expense) => {
    Alert.alert('Elimina', `Eliminare la spesa di €${expense.amount}?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          if (expense.receipt_path) {
            await supabase.storage.from('receipts').remove([expense.receipt_path]);
          }
          await supabase.from('expenses').delete().eq('id', expense.id);
          load();
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#007AFF" />;

  return (
    <View style={styles.container}>
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>Totale trasferta</Text>
        <Text style={styles.totalAmount}>€{total.toFixed(2)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={e => e.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Nessuna spesa ancora.{'\n'}Premi + per aggiungerne una.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => deleteExpense(item)}>
            <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[item.category] ?? '📎'}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardCategory}>{item.category}</Text>
              <Text style={styles.cardDate}>{item.date}</Text>
              {item.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text> : null}
            </View>
            <Text style={styles.cardAmount}>€{Number(item.amount).toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.fabs}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push({ pathname: '/expense/add', params: { tripId: id, tripName: name } })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
        {expenses.length > 0 && (
          <TouchableOpacity
            style={[styles.fab, styles.fabExport]}
            onPress={() => router.push({ pathname: '/export/[id]', params: { id, name } })}
          >
            <Text style={styles.fabText}>📤</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f2f2f7' },
  center:       { flex: 1, justifyContent: 'center' },
  totalBanner:  { backgroundColor: '#007AFF', padding: 20, alignItems: 'center' },
  totalLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  totalAmount:  { color: '#fff', fontSize: 34, fontWeight: '700', marginTop: 4 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 14 },
  cardEmoji:    { fontSize: 28, marginRight: 12 },
  cardBody:     { flex: 1 },
  cardCategory: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  cardDate:     { fontSize: 12, color: '#888', marginTop: 2 },
  cardNotes:    { fontSize: 12, color: '#aaa', marginTop: 2 },
  cardAmount:   { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  empty:        { textAlign: 'center', color: '#aaa', marginTop: 60, lineHeight: 24 },
  fabs:         { position: 'absolute', bottom: 32, right: 20, gap: 12 },
  fab:          { width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  fabExport:    { backgroundColor: '#34C759' },
  fabText:      { color: '#fff', fontSize: 26, lineHeight: 30 },
});
