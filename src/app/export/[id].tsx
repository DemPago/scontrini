import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import { useLocalSearchParams } from 'expo-router';
import { supabase, Expense } from '../../lib/supabase';
import { getUser } from '../../lib/user';

export default function ExportScreen() {
  const { id, name, excelUrl, surname } = useLocalSearchParams<{ id: string; name: string; excelUrl: string; surname: string }>();

  const [toEmail, setToEmail]     = useState('');
  const [exporting, setExporting] = useState(false);

  const send = async () => {
    if (!toEmail.trim()) { Alert.alert('Email mancante', 'Inserisci un indirizzo email.'); return; }
    if (!(await MailComposer.isAvailableAsync())) { Alert.alert('Mail non disponibile', 'Configura un account email sul dispositivo.'); return; }

    setExporting(true);
    try {
      // Scarica Excel già generato da Supabase Storage
      const filename  = excelUrl.split('/').pop() ?? `${name}.xlsx`;
      const localPath = `${FileSystem.cacheDirectory}${filename}`;
      const info      = await FileSystem.getInfoAsync(localPath);
      if (!info.exists) await FileSystem.downloadAsync(excelUrl, localPath);

      // Scarica foto scontrini
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, receipt_url')
        .eq('trip_id', id);

      const attachments: string[] = [localPath];
      for (const e of (expenses ?? []) as Pick<Expense, 'id' | 'receipt_url'>[]) {
        if (!e.receipt_url) continue;
        const ext  = e.receipt_url.split('.').pop()?.split('?')[0] ?? 'jpg';
        const path = `${FileSystem.cacheDirectory}receipt_${e.id}.${ext}`;
        if (!(await FileSystem.getInfoAsync(path)).exists) {
          await FileSystem.downloadAsync(e.receipt_url, path);
        }
        attachments.push(path);
      }

      await MailComposer.composeAsync({
        recipients: [toEmail.trim()],
        subject: `Note spese ${surname || 'Scontrini'} — ${name}`,
        body: `In allegato il riepilogo spese per "${name}".`,
        attachments,
      });
    } catch (err: any) {
      Alert.alert('Errore', err.message ?? String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.summary}>
        <Text style={styles.summaryEmoji}>📊</Text>
        <Text style={styles.summaryName}>{name}</Text>
        <Text style={styles.summaryFile}>{excelUrl.split('/').pop()}</Text>
      </View>

      <Text style={styles.label}>Destinatario</Text>
      <TextInput
        style={styles.input}
        value={toEmail}
        onChangeText={setToEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="amministrazione@azienda.it"
        autoFocus
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Verrà allegato l'Excel già generato + tutte le foto degli scontrini.</Text>
      </View>

      <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={exporting}>
        {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>📤 Invia</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  summary:     { backgroundColor: '#8e8e93', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  summaryEmoji:{ fontSize: 40 },
  summaryName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 },
  summaryFile: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  label:       { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 16 },
  input:       { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16 },
  infoBox:     { backgroundColor: '#e8f4fd', borderRadius: 10, padding: 14, marginTop: 20 },
  infoText:    { color: '#555', fontSize: 13, lineHeight: 20 },
  sendBtn:     { marginTop: 28, backgroundColor: '#34C759', borderRadius: 12, padding: 16, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
