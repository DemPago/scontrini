import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase, Category, CATEGORIES } from '../lib/supabase';

export default function AddScreen() {
  const router = useRouter();
  const today  = new Date().toISOString().split('T')[0];

  const [date, setDate]         = useState(today);
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState<Category>('altro');
  const [notes, setNotes]       = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) { Alert.alert('Permesso negato', 'Abilita il permesso nelle impostazioni.'); return; }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!amount || isNaN(parseFloat(amount))) { Alert.alert('Importo mancante', 'Inserisci un importo valido.'); return; }
    setSaving(true);

    let receipt_url: string | null  = null;
    let receipt_path: string | null = null;

    if (imageUri) {
      const ext      = imageUri.split('.').pop() ?? 'jpg';
      const path     = `${Date.now()}.${ext}`;
      const response = await fetch(imageUri);
      const blob     = await response.blob();

      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(path, blob, { contentType: `image/${ext}` });

      if (upErr) { Alert.alert('Upload fallito', upErr.message); setSaving(false); return; }

      receipt_path = path;
      receipt_url  = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from('expenses').insert({
      date, amount: parseFloat(amount), category, notes, receipt_url, receipt_path,
    });

    setSaving(false);
    if (error) { Alert.alert('Errore salvataggio', error.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <View style={styles.photoRow}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={styles.preview} />
          : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderText}>Nessuna foto</Text></View>
        }
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
            <Text style={styles.photoBtnText}>📷 Fotocamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { marginTop: 8 }]} onPress={() => pickImage(false)}>
            <Text style={styles.photoBtnText}>🖼 Galleria</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>Importo (€)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />

      <Text style={styles.label}>Data</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.categories}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, category === c && styles.catChipActive]}
            onPress={() => setCategory(c)}
          >
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
  photoPlaceholderText: { color: '#999', fontSize: 12, textAlign: 'center' },
  photoButtons:         { flex: 1, justifyContent: 'center' },
  photoBtn:             { backgroundColor: '#007AFF', borderRadius: 8, padding: 10, alignItems: 'center' },
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
