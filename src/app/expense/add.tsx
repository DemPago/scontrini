import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, Category, CATEGORIES } from '../../lib/supabase';
import { getUser, ownerKey } from '../../lib/user';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`;

export default function AddExpenseScreen() {
  const router = useRouter();
  const { tripId, tripName } = useLocalSearchParams<{ tripId: string; tripName: string }>();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate]         = useState(today);
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState<Category>('altro');
  const [notes, setNotes]       = useState('');
  const [attachmentUri, setAttachmentUri]   = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [analyzing, setAnalyzing]           = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permesso negato', 'Abilita il permesso nelle impostazioni.'); return; }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled) {
      setAttachmentUri(result.assets[0].uri);
      setAttachmentName(null);
    }
  };

  const analyzeWithAI = async () => {
    if (!attachmentUri || attachmentName) return;
    setAnalyzing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(attachmentUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: 'Analizza questo scontrino. Rispondi SOLO con JSON: {"importo":"numero es 12.50","data":"YYYY-MM-DD o null","categoria":"pranzo|cena|trasporto|hotel|altro"}. Nessun testo aggiuntivo.' },
          ]}],
          generationConfig: { temperature: 0.1 },
        }),
      });
      if ([429, 402, 403].includes(res.status)) {
        Alert.alert(
          'Limite AI raggiunto',
          "Hai esaurito le richieste gratuite per oggi.\nPuoi continuare a usare l'app normalmente.\nRiprova domani per l'AI. 🤖"
        );
        return;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = errBody?.error?.message ?? '';
        if (/quota|limit|exhausted|billing|payment/i.test(errMsg)) {
          Alert.alert(
            'Limite AI raggiunto',
            "Hai esaurito le richieste gratuite per oggi.\nPuoi continuare a usare l'app normalmente.\nRiprova domani per l'AI. 🤖"
          );
          return;
        }
        throw new Error(`Errore API ${res.status}`);
      }
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Risposta non valida');
      const parsed = JSON.parse(match[0]);
      if (parsed.importo) setAmount(String(parsed.importo));
      if (parsed.data)    setDate(parsed.data);
      if (parsed.categoria && CATEGORIES.includes(parsed.categoria as Category))
        setCategory(parsed.categoria as Category);
    } catch {
      Alert.alert('AI non disponibile', 'Impossibile analizzare lo scontrino. Compila i campi manualmente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets.length > 0) {
      setAttachmentUri(result.assets[0].uri);
      setAttachmentName(result.assets[0].name);
    }
  };

  const save = async () => {
    if (!amount || isNaN(parseFloat(amount))) { Alert.alert('Importo mancante', 'Inserisci un importo valido.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Data non valida', 'Usa il formato YYYY-MM-DD, es: 2026-10-24.'); return; }
    setSaving(true);

    let receipt_url: string | null  = null;
    let receipt_path: string | null = null;

    if (attachmentUri) {
      const isDoc  = !!attachmentName;
      const ext    = isDoc
        ? (attachmentName!.split('.').pop() ?? 'pdf')
        : (attachmentUri.split('.').pop() ?? 'jpg');
      const slug   = (tripName ?? 'trasferta').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const user   = await getUser();
      const owner  = user ? ownerKey(user) : 'unknown';
      const path   = `${owner}/${slug}/${Date.now()}.${ext}`;

      const response = await fetch(attachmentUri);
      const blob     = await response.blob();
      const mime     = isDoc ? (blob.type || `application/${ext}`) : `image/${ext}`;

      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(path, blob, { contentType: mime });

      if (upErr) { Alert.alert('Upload fallito', upErr.message); setSaving(false); return; }

      receipt_path = path;
      receipt_url  = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from('expenses').insert({
      trip_id: tripId,
      date,
      amount: parseFloat(amount),
      category,
      notes,
      receipt_url,
      receipt_path,
    });

    setSaving(false);
    if (error) { Alert.alert('Errore salvataggio', error.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.photoRow}>
        {attachmentUri && !attachmentName
          ? <Image source={{ uri: attachmentUri }} style={styles.preview} />
          : attachmentUri && attachmentName
          ? <View style={styles.photoPlaceholder}><Text style={styles.docIcon}>📄</Text><Text style={styles.photoPlaceholderText} numberOfLines={2}>{attachmentName}</Text></View>
          : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderText}>Nessun allegato</Text></View>
        }
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
            <Text style={styles.photoBtnText}>📷 Fotocamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { marginTop: 8 }]} onPress={() => pickImage(false)}>
            <Text style={styles.photoBtnText}>🖼 Galleria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { marginTop: 8 }]} onPress={pickDocument}>
            <Text style={styles.photoBtnText}>📎 Documento</Text>
          </TouchableOpacity>
          {attachmentUri && !attachmentName && (
            <TouchableOpacity
              style={[styles.photoBtn, styles.photoBtnAI, { marginTop: 8 }]}
              onPress={analyzeWithAI}
              disabled={analyzing}
            >
              {analyzing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.photoBtnText}>🤖 Analizza</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.label}>Importo (€)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />

      <Text style={styles.label}>Data</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.categories}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Note (opzionale)</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} placeholder="Es: cena con cliente" multiline />

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva spesa</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  photoRow:             { flexDirection: 'row', gap: 12, marginBottom: 20 },
  preview:              { width: 120, height: 120, borderRadius: 10 },
  photoPlaceholder:     { width: 120, height: 120, borderRadius: 10, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { color: '#999', fontSize: 11, textAlign: 'center', paddingHorizontal: 4 },
  docIcon:              { fontSize: 28, marginBottom: 4 },
  photoButtons:         { flex: 1, justifyContent: 'center' },
  photoBtn:             { backgroundColor: '#007AFF', borderRadius: 8, padding: 10, alignItems: 'center' },
  photoBtnAI:           { backgroundColor: '#8e44ad' },
  photoBtnText:         { color: '#fff', fontWeight: '600' },
  label:                { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 14 },
  input:                { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16 },
  categories:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:              { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#e0e0e0' },
  catChipActive:        { backgroundColor: '#007AFF' },
  catText:              { fontSize: 14, color: '#444', textTransform: 'capitalize' },
  catTextActive:        { color: '#fff', fontWeight: '600' },
  saveBtn:              { marginTop: 28, backgroundColor: '#34C759', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText:          { color: '#fff', fontSize: 17, fontWeight: '700' },
});
