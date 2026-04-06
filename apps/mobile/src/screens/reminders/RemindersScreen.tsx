import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  datetime: string;
  recurrence: string;
  notified: boolean;
}

export default function RemindersScreen() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', datetime: '', recurrence: 'none' });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders-mobile'],
    queryFn: () => client.get('/reminders').then((r) => r.data as Reminder[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      client.post('/reminders', { ...data, datetime: new Date(data.datetime).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders-mobile'] });
      setShowModal(false);
      setForm({ title: '', description: '', datetime: '', recurrence: 'none' });
    },
    onError: () => Alert.alert('Error', 'Failed to create reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/reminders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders-mobile'] }),
  });

  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();
  const isFuture = (date: string) => new Date(date) >= new Date();

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={reminders ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, isToday(item.datetime) && styles.cardToday]}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.headerRow}>
                    <Text style={styles.title}>{item.title}</Text>
                    {isToday(item.datetime) && (
                      <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
                    )}
                  </View>
                  {item.description && <Text style={styles.desc}>{item.description}</Text>}
                  <Text style={styles.datetime}>📅 {new Date(item.datetime).toLocaleString()}</Text>
                  {item.recurrence !== 'none' && (
                    <Text style={styles.recurrence}>🔁 {item.recurrence}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Delete', `Delete "${item.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item._id) },
                  ])}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
              </View>
              {item.notified && (
                <View style={styles.notifiedRow}>
                  <Text style={styles.notifiedText}>✓ Notification sent</Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No reminders yet. Tap + to add one!</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>New Reminder</Text>
          <TextInput
            style={styles.input}
            placeholder="Title *"
            value={form.title}
            onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            value={form.description}
            onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Date & Time (YYYY-MM-DD HH:MM) *"
            value={form.datetime}
            onChangeText={(t) => setForm((f) => ({ ...f, datetime: t }))}
          />
          <Text style={styles.label}>Recurrence</Text>
          <View style={styles.recurrenceRow}>
            {['none', 'daily', 'weekly', 'monthly'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.recurrenceBtn, form.recurrence === r && styles.recurrenceBtnActive]}
                onPress={() => setForm((f) => ({ ...f, recurrence: r }))}
              >
                <Text style={[styles.recurrenceBtnText, form.recurrence === r && styles.recurrenceBtnTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.submitBtn}
              disabled={!form.title || !form.datetime || createMutation.isPending}
              onPress={() => createMutation.mutate(form)}
            >
              <Text style={styles.submitBtnText}>{createMutation.isPending ? 'Saving...' : 'Create Reminder'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loader: { marginTop: 48 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardToday: { borderWidth: 1.5, borderColor: '#6366f1' },
  cardContent: { flexDirection: 'row', padding: 14, gap: 10 },
  cardLeft: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600', color: '#1f2937', flex: 1 },
  todayBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  todayBadgeText: { fontSize: 11, color: '#6366f1', fontWeight: '600' },
  desc: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  datetime: { fontSize: 12, color: '#6b7280' },
  recurrence: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 22, color: '#d1d5db' },
  notifiedRow: { backgroundColor: '#ecfdf5', paddingHorizontal: 14, paddingVertical: 6 },
  notifiedText: { fontSize: 12, color: '#065f46' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  modal: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15 },
  textArea: { height: 70, textAlignVertical: 'top' },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8 },
  recurrenceRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  recurrenceBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  recurrenceBtnActive: { borderColor: '#6366f1', backgroundColor: '#e0e7ff' },
  recurrenceBtnText: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' },
  recurrenceBtnTextActive: { color: '#6366f1', fontWeight: '600' },
  actions: { gap: 10 },
  submitBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { color: '#6b7280', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 15 },
});
