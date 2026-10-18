import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as XLSX from 'xlsx';
import { supabase, Expense } from '../lib/supabase';

export default function ExportScreen() {
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toEmail, setToEmail]     = useState('');
  const [tripName, setTripName]   = useState('');

  useEffect(() => {
    supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: true })
      .then(({ data }) => { setExpenses(data ?? []); setLoading(false); });
  }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const exportAndSend = async () => {
    if (!toEmail.trim()) { Alert.alert('Email mancante', 'Inserisci un indirizzo email.'); return; }
    if (!(await MailComposer.isAvailableAsync())) { Alert.alert('Mail non disponibile', 'Configura un account email sul dispositivo.'); return; }

    setExporting(true);
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

      const ws          = XLSX.utils.json_to_sheet(rows);
      const wb          = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Spese');
      const xlsxBase64  = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const label       = (tripName.trim() || 'trasferta').replace(/\s+/g, '_');
      const xlsxPath    = `${FileSystem.cacheDirectory}${label}.xlsx`;
      await FileSystem.writeAsStringAsync(xlsxPath, xlsxBase64, { encoding: FileSystem.EncodingType.Base64 });

      const attachments: string[] = [xlsxPath];
      for (const e of expenses) {
        if (!e.receipt_url) continue;
        const ext       = e.receipt_url.split('.').pop()?.split('?')[0] ?? 'jpg';
        const localPath = `${FileSystem.cacheDirectory}receipt_${e.id}.${ext}`;
        if (!(await FileSystem.getInfoAsync(localPath)).exists) {
          await FileSystem.downloadAsync(e.receipt_url, localPath);
        }
        attachments.push(localPath);
      }

      await MailComposer.composeAsync({
        recipients: [toEmail.trim()],
        subject: `Note spese — ${tripName.trim() || 'trasferta'} (€${total.toFixed(2)})`,
        body: `In allegato il riepilogo spese${tripName ? ` per "${tripName}"` : ''}: ${expenses.length} voci, totale €${total.toFixed(2)}.`,
        attachments,
      });
    } catch (err: any) {
      Alert.alert('Errore export', err.message ?? String(err));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Riepilogo</Text>
        <Text style={styles.summaryTotal}>€{total.toFixed(2)}</Text>
        <Text style={styles.summaryCount}>{expenses.length} {expenses.length === 1 ? 'spesa' : 'spese'}</Text>
      </View>

      <Text style={styles.label}>Destinatario</Text>
      <TextInput style={styles.input} value={toEmail} onChangeText={setToEmail} keyboardType="email-address" autoCapitalize="none" placeholder="amministrazione@azienda.it" />

      <Text style={styles.label}>Nome trasferta (opzionale)</Text>
      <TextInput style={styles.input} value={tripName} onChangeText={setTripName} placeholder="Es: Milano 18-19 ott" />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Verrà allegato un file Excel con tutte le spese + le foto degli scontrini.</Text>
      </View>

      <TouchableOpacity style={styles.exportBtn} onPress={exportAndSend} disabled={exporting}>
        {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportBtnText}>📤 Genera e invia</Text>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  summary:      { backgroundColor: '#007AFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryTotal: { color: '#fff', fontSize: 42, fontWeight: '700', marginTop: 4 },
  summaryCount: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  label:        { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 16 },
  input:        { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16 },
  infoBox:      { backgroundColor: '#e8f4fd', borderRadius: 10, padding: 14, marginTop: 20 },
  infoText:     { color: '#555', fontSize: 13, lineHeight: 20 },
  exportBtn:    { marginTop: 28, backgroundColor: '#34C759', borderRadius: 12, padding: 16, alignItems: 'center' },
  exportBtnText:{ color: '#fff', fontSize: 17, fontWeight: '700' },
});
