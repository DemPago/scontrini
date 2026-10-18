import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, tripLabel, SURNAME } from '../../lib/supabase';
import { getUser, ownerKey } from '../../lib/user';

const MONTHS = [
  'Gen','Feb','Mar','Apr','Mag','Giu',
  'Lug','Ago','Set','Ott','Nov','Dic',
];

export default function NewTripScreen() {
  const router = useRouter();
  const now    = new Date();

  const [location, setLocation]   = useState('');
  const [year, setYear]           = useState(String(now.getFullYear()));
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [eventName, setEventName] = useState('');
  const [saving, setSaving]       = useState(false);

  const preview = location.trim()
    ? tripLabel({ location: location.trim(), year: Number(year), month, event_name: eventName.trim() || null })
    : '…';

  const create = async () => {
    if (!location.trim()) { Alert.alert('Luogo mancante', 'Inserisci il luogo della trasferta.'); return; }
    if (!year || isNaN(Number(year))) { Alert.alert('Anno mancante', 'Inserisci un anno valido.'); return; }

    setSaving(true);
    const slug  = preview.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const user  = await getUser();
    const owner = user ? ownerKey(user) : 'unknown';

    const { error } = await supabase.from('trips').insert({
      name: preview,
      slug,
      location: location.trim(),
      year: Number(year),
      month,
      event_name: eventName.trim() || null,
      status: 'open',
      owner,
    });

    setSaving(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Luogo *</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Es: Torino" autoFocus />

      <Text style={styles.label}>Anno *</Text>
      <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2026" maxLength={4} />

      <Text style={styles.label}>Mese *</Text>
      <View style={styles.months}>
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.monthChip, month === i + 1 && styles.monthChipActive]}
            onPress={() => setMonth(i + 1)}
          >
            <Text style={[styles.monthText, month === i + 1 && styles.monthTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Nome evento (opzionale)</Text>
      <TextInput style={styles.input} value={eventName} onChangeText={setEventName} placeholder="Es: WaveByVento" />

      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>Nome file Excel:</Text>
        <Text style={styles.previewName}>{SURNAME}_{preview}.xlsx</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={create} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crea trasferta</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f2f2f7', padding: 20 },
  label:           { fontSize: 13, color: '#666', marginBottom: 8, marginTop: 16 },
  input:           { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16 },
  months:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip:       { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e0e0e0' },
  monthChipActive: { backgroundColor: '#007AFF' },
  monthText:       { fontSize: 13, color: '#444' },
  monthTextActive: { color: '#fff', fontWeight: '600' },
  previewBox:      { marginTop: 24, backgroundColor: '#e8f4fd', borderRadius: 10, padding: 14 },
  previewLabel:    { fontSize: 12, color: '#555', marginBottom: 4 },
  previewName:     { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  btn:             { marginTop: 28, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:         { color: '#fff', fontSize: 17, fontWeight: '700' },
});
