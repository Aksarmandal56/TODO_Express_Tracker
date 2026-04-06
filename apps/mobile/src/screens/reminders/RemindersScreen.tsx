import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import dayjs from 'dayjs';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#6C5CE7',
  primaryLight: '#EAE8FF',
  orange: '#F97316',
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  bg: '#F8F9FA',
  white: '#FFFFFF',
  dark: '#1F2937',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  border: '#E5E7EB',
};

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  datetime: string;
  recurrence: string;
  notified: boolean;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    low:    { bg: '#F3F4F6', text: C.gray },
    medium: { bg: '#FFF7ED', text: C.orange },
    high:   { bg: '#FEF2F2', text: C.red },
    urgent: { bg: '#FEF2F2', text: C.red },
  };
  const c = cfg[priority] ?? cfg.low;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    todo:        { bg: '#ECFDF5', text: C.green,  label: 'To-do' },
    in_progress: { bg: '#DBEAFE', text: C.blue,   label: 'In Progress' },
    in_review:   { bg: '#FEF3C7', text: C.yellow, label: 'In Review' },
    done:        { bg: '#D1FAE5', text: C.green,  label: 'Done' },
    pending:     { bg: '#F3F4F6', text: C.gray,   label: 'Pending' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// Left-accent reminder card
function ReminderCard({
  reminder,
  accentColor,
  onDelete,
}: {
  reminder: Reminder;
  accentColor: string;
  onDelete: () => void;
}) {
  const isToday = dayjs(reminder.datetime).isSame(dayjs(), 'day');
  const isFuture = dayjs(reminder.datetime).isAfter(dayjs());
  const isPast = !isFuture && !isToday;
  const statusKey = isPast ? 'pending' : isToday ? 'in_progress' : 'todo';

  return (
    <View style={styles.reminderCard}>
      <View style={[styles.reminderAccent, { backgroundColor: accentColor }]} />
      <View style={styles.reminderBody}>
        <View style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>{reminder.title}</Text>
            {reminder.description ? (
              <Text style={styles.reminderDesc} numberOfLines={1}>{reminder.description}</Text>
            ) : null}
            <View style={styles.reminderMeta}>
              <Text style={styles.reminderTime}>
                🕐 {isToday ? 'Today' : dayjs(reminder.datetime).format('MMM D')} – {dayjs(reminder.datetime).format('h:mm A')}
              </Text>
              <PriorityBadge priority="medium" />
              <StatusBadge status={statusKey} />
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Delete', `Delete "${reminder.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ])
            }
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>×</Text>
          </TouchableOpacity>
        </View>
        {reminder.notified && (
          <View style={styles.notifiedRow}>
            <Text style={styles.notifiedText}>✓ Notification sent</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Push notification preview banner
function NotificationBanner({ task }: { task?: Task }) {
  if (!task) return null;
  return (
    <View style={styles.notifBanner}>
      <View style={styles.notifHeader}>
        <View style={styles.notifIcon}>
          <Text style={{ fontSize: 14 }}>🔔</Text>
        </View>
        <Text style={styles.notifApp}>Task Manager</Text>
        <Text style={styles.notifNow}>· now</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.notifMore}>···</Text>
      </View>
      <Text style={styles.notifTitle}>Upcoming task reminder:</Text>
      <Text style={styles.notifBody}>
        {task.title} {task.dueDate ? `Today – ${dayjs(task.dueDate).format('h:mm A')}` : ''}
      </Text>
      <Text style={styles.notifAction}>→ Tap to view</Text>
    </View>
  );
}

// Create Reminder Modal
function CreateReminderModal({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: '', description: '', datetime: '', recurrence: 'none' });

  const mutation = useMutation({
    mutationFn: () =>
      client.post('/reminders', {
        ...form,
        datetime: new Date(form.datetime).toISOString(),
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      setForm({ title: '', description: '', datetime: '', recurrence: 'none' });
    },
    onError: () => Alert.alert('Error', 'Failed to create reminder'),
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>New Reminder</Text>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Book Doctor Appointment"
            placeholderTextColor={C.lightGray}
            value={form.title}
            onChangeText={v => set('title', v)}
          />
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            placeholder="Add details..."
            placeholderTextColor={C.lightGray}
            value={form.description}
            onChangeText={v => set('description', v)}
            multiline
          />
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <View style={styles.dateRow}>
            <Text style={{ fontSize: 18 }}>📅</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder={`e.g. ${dayjs().format('DD MMM, YYYY HH:mm')}`}
              placeholderTextColor={C.lightGray}
              value={form.datetime}
              onChangeText={v => set('datetime', v)}
            />
          </View>
          <View style={{ height: 16 }} />
          <Text style={styles.fieldLabel}>Recurrence</Text>
          <View style={styles.recurrenceRow}>
            {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.recurrenceBtn, form.recurrence === r && styles.recurrenceBtnActive]}
                onPress={() => set('recurrence', r)}
              >
                <Text style={[styles.recurrenceBtnText, form.recurrence === r && styles.recurrenceBtnTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 24 }} />
          <TouchableOpacity
            style={[styles.submitBtn, (!form.title || !form.datetime || mutation.isPending) && { opacity: 0.6 }]}
            disabled={!form.title || !form.datetime || mutation.isPending}
            onPress={() => mutation.mutate()}
          >
            <Text style={styles.submitBtnText}>
              {mutation.isPending ? 'Saving...' : 'Create Reminder'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ACCENT_COLORS = ['#F97316', '#6C5CE7', '#3B82F6', '#10B981', '#EC4899', '#F59E0B'];

export default function RemindersScreen() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);

  const { data: reminders = [], isLoading: loadingReminders } = useQuery({
    queryKey: ['reminders-mobile'],
    queryFn: () => client.get('/reminders').then(r => r.data as Reminder[]),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => client.get('/tasks').then(r => r.data as { tasks: Task[] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders-mobile'] }),
  });

  const now = dayjs();
  const upcoming = reminders.filter(r => dayjs(r.datetime).isAfter(now) || dayjs(r.datetime).isSame(now, 'day'));
  const overdue = reminders.filter(r => dayjs(r.datetime).isBefore(now) && !dayjs(r.datetime).isSame(now, 'day'));

  // Pick a task for the notification preview
  const previewTask = tasksData?.tasks?.find(t => t.status === 'in_progress' || t.status === 'todo');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Reminders</Text>
          <Text style={styles.headerSub}>Never miss important tasks</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      {loadingReminders ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

          {/* Upcoming Reminders Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Reminder</Text>
            <Switch
              value={showUpcoming}
              onValueChange={setShowUpcoming}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>

          {showUpcoming && upcoming.length === 0 && (
            <Text style={styles.emptyText}>No upcoming reminders.</Text>
          )}
          {showUpcoming && upcoming.map((r, i) => (
            <ReminderCard
              key={r._id}
              reminder={r}
              accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
              onDelete={() => deleteMutation.mutate(r._id)}
            />
          ))}

          {/* Notification Banner */}
          <NotificationBanner task={previewTask} />

          {/* Overdue Tasks Section */}
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Overdue Tasks</Text>
            <Switch
              value={showOverdue}
              onValueChange={setShowOverdue}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>

          {showOverdue && overdue.length === 0 && (
            <Text style={styles.emptyText}>No overdue reminders. You're on track! 🎉</Text>
          )}
          {showOverdue && overdue.map((r, i) => (
            <ReminderCard
              key={r._id}
              reminder={r}
              accentColor={['#6C5CE7', '#EF4444', '#F97316'][i % 3]}
              onDelete={() => deleteMutation.mutate(r._id)}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <CreateReminderModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ['reminders-mobile'] })}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.dark },
  headerSub: { fontSize: 13, color: C.gray, marginTop: 2 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.dark },

  // Reminder Card
  reminderCard: { backgroundColor: C.white, borderRadius: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  reminderAccent: { width: 4 },
  reminderBody: { flex: 1 },
  reminderRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 8 },
  reminderTitle: { fontSize: 14, fontWeight: '600', color: C.dark, marginBottom: 2 },
  reminderDesc: { fontSize: 12, color: C.gray, marginBottom: 6 },
  reminderMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  reminderTime: { fontSize: 11, color: C.lightGray },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 22, color: C.border },
  notifiedRow: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6 },
  notifiedText: { fontSize: 11, color: '#065F46' },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '500' },

  // Notification Banner
  notifBanner: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginVertical: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  notifIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  notifApp: { fontSize: 12, fontWeight: '600', color: C.dark },
  notifNow: { fontSize: 12, color: C.lightGray, marginLeft: 2 },
  notifMore: { fontSize: 16, color: C.lightGray },
  notifTitle: { fontSize: 13, fontWeight: '600', color: C.dark },
  notifBody: { fontSize: 12, color: C.gray, marginTop: 2 },
  notifAction: { fontSize: 12, color: C.primary, marginTop: 6 },

  // FAB
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  // Empty
  emptyText: { textAlign: 'center', color: C.lightGray, fontSize: 14, marginBottom: 12 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.dark, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.dark, marginBottom: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recurrenceRow: { flexDirection: 'row', gap: 8 },
  recurrenceBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: '#F9FAFB' },
  recurrenceBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  recurrenceBtnText: { fontSize: 12, color: C.gray },
  recurrenceBtnTextActive: { color: C.primary, fontWeight: '600' },
  submitBtn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { color: C.gray, fontSize: 14 },
});
