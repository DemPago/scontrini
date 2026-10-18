import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import * as XLSX from 'xlsx';
import { supabase, Expense, Trip, tripFileName, OWNER } from '../../lib/supabase';

const CATEGORY_EMOJI: Record<string, string> = {
  pranzo: '🍝', cena: '🍷', trasporto: '🚆', hotel: '🏨', altro: '📎',
};

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router     = useRouter();
  const navigation = useNavigation();

  const [trip, setTrip]         = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [closing, setClosing]   = useState(false);
  const [total, setTotal]       = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: tripData }, { data: expData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('expenses').select('*').eq('trip_id', id).order('date', { ascending: false }),
    ]);
    if (tripData) {
      setTrip(tripData);
      navigation.setOptions({ title: tripData.name });
    }
    setExpenses(expData ?? []);
    setTotal((expData ?? []).reduce((s, e) => s + Number(e.amount), 0));
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const deleteExpense = (expense: Expense) => {
    Alert.alert('Elimina', `Eliminare la spesa di €${expense.amount}?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          if (expense.receipt_path) await supabase.storage.from('receipts').remove([expense.receipt_path]);
          await supabase.from('expenses').delete().eq('id', expense.id);
          load();
        },
      },
    ]);
  };

  const closeTrip = async () => {
    if (!trip || expenses.length === 0) { Alert.alert('Nessuna spesa', 'Aggiungi almeno una spesa prima di chiudere.'); return; }
    Alert.alert('Chiudi trasferta', 'Genera l\'Excel su Supabase e chiudi la trasferta?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Chiudi', onPress: async () => {
          setClosing(true);
          try {
            const rows = [
              ...expenses.map(e => ({
                Data: e.date,
                Categoria: e.category,
                'Importo (€)': Number(e.amount).toFixed(2),
                Note: e.notes,
                Scontrino: e.receipt_url ?? '',
              })),
              { Data: '', Categoria: 'TOTALE', 'Importo (€)': total.toFixed(2), Note: '', Scontrino: '' },
            ];

            const ws   = XLSX.utils.json_to_sheet(rows);
            const wb   = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Spese');
            const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const filename = tripFileName(trip);
            const path     = `${OWNER}/${filename}`;

            const { error: upErr } = await supabase.storage
              .from('exports')
              .upload(path, blob, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });

            if (upErr) { Alert.alert('Upload fallito', upErr.message); setClosing(false); return; }

            const excel_url = supabase.storage.from('exports').getPublicUrl(path).data.publicUrl;

            await supabase.from('trips').update({ status: 'closed', excel_url }).eq('id', id);
            load();
          } catch (err: any) {
            Alert.alert('Errore', err.message ?? String(err));
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#007AFF" />;

  const isClosed = trip?.status === 'closed';

  return (
    <View style={styles.container}>
      <View style={[styles.totalBanner, isClosed && styles.totalBannerClosed]}>
        <Text style={styles.totalLabel}>{isClosed ? '🔒 Trasferta chiusa' : 'Totale trasferta'}</Text>
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
          <TouchableOpacity style={styles.card} onLongPress={() => !isClosed && deleteExpense(item)}>
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

      {!isClosed && (
        <View style={styles.fabs}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push({ pathname: '/expense/add', params: { tripId: id, tripName: trip?.name } })}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
          {expenses.length > 0 && (
            <TouchableOpacity style={[styles.fab, styles.fabClose]} onPress={closeTrip} disabled={closing}>
              {closing ? <ActivityIndicator color="#fff" /> : <Text style={styles.fabText}>🔒</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {isClosed && trip?.excel_url && (
        <TouchableOpacity
          style={styles.exportBar}
          onPress={() => router.push({ pathname: '/export/[id]', params: { id, name: trip.name, excelUrl: trip.excel_url! } })}
        >
          <Text style={styles.exportBarText}>📤 Invia Excel via mail</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f2f2f7' },
  center:            { flex: 1, justifyContent: 'center' },
  totalBanner:       { backgroundColor: '#007AFF', padding: 20, alignItems: 'center' },
  totalBannerClosed: { backgroundColor: '#8e8e93' },
  totalLabel:        { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  totalAmount:       { color: '#fff', fontSize: 34, fontWeight: '700', marginTop: 4 },
  card:              { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 14 },
  cardEmoji:         { fontSize: 28, marginRight: 12 },
  cardBody:          { flex: 1 },
  cardCategory:      { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  cardDate:          { fontSize: 12, color: '#888', marginTop: 2 },
  cardNotes:         { fontSize: 12, color: '#aaa', marginTop: 2 },
  cardAmount:        { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  empty:             { textAlign: 'center', color: '#aaa', marginTop: 60, lineHeight: 24 },
  fabs:              { position: 'absolute', bottom: 32, right: 20, gap: 12 },
  fab:               { width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  fabClose:          { backgroundColor: '#FF9500' },
  fabText:           { color: '#fff', fontSize: 26, lineHeight: 30 },
  exportBar:         { margin: 16, backgroundColor: '#34C759', borderRadius: 12, padding: 16, alignItems: 'center' },
  exportBarText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
