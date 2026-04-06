import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags: string[];
  taskType?: string;
}

// ─── Task Types Config ────────────────────────────────────────────────────────
const TASK_TYPES = [
  { label: 'Shopping', color: '#EC4899', bg: '#FDF2F8' },
  { label: 'Work',     color: C.primary, bg: C.primaryLight },
  { label: 'Gym',      color: C.green,   bg: '#ECFDF5' },
  { label: 'School',   color: C.blue,    bg: '#EFF6FF' },
  { label: 'Home',     color: C.orange,  bg: '#FFF7ED' },
  { label: 'Yoga',     color: '#F472B6', bg: '#FDF2F8' },
  { label: 'Meditation', color: '#14B8A6', bg: '#F0FDFA' },
];

// ─── Badge helpers ────────────────────────────────────────────────────────────
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
      <Text style={[styles.badgeText, { color: c.text }]}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    todo:        { bg: '#ECFDF5', text: C.green,  label: 'To-do' },
    in_progress: { bg: '#DBEAFE', text: C.blue,   label: 'In Progress' },
    in_review:   { bg: '#FEF3C7', text: C.yellow, label: 'In Review' },
    done:        { bg: '#D1FAE5', text: C.green,  label: 'Done' },
  };
  const c = cfg[status] ?? cfg.todo;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// ─── Progress Circle (pure RN, no SVG) ────────────────────────────────────────
function ProgressCircle({ total, done }: { total: number; done: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  // Approximate arc using border trick (two halves)
  const size = 64;
  const half = size / 2;
  const rotation1 = Math.min(pct, 50) * 3.6;
  const rotation2 = pct > 50 ? (pct - 50) * 3.6 : 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: half,
        borderWidth: 5, borderColor: 'rgba(255,255,255,0.25)',
      }} />
      {/* Right half fill */}
      <View style={{
        position: 'absolute', width: size, height: size,
        overflow: 'hidden',
      }}>
        <View style={{ width: size, height: size, borderRadius: half,
          borderWidth: 5, borderColor: 'transparent',
          borderRightColor: '#fff', borderBottomColor: pct >= 25 ? '#fff' : 'transparent',
          transform: [{ rotate: `${rotation1 - 45}deg` }],
        }} />
      </View>
      {/* Left half fill (for > 50%) */}
      {pct > 50 && (
        <View style={{
          position: 'absolute', width: size, height: size,
          overflow: 'hidden',
        }}>
          <View style={{ width: size, height: size, borderRadius: half,
            borderWidth: 5, borderColor: 'transparent',
            borderLeftColor: '#fff', borderTopColor: '#fff',
            transform: [{ rotate: `${rotation2 - 45}deg` }],
          }} />
        </View>
      )}
      {/* Centre text */}
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{pct}%</Text>
    </View>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const type = TASK_TYPES.find(t => t.label.toLowerCase() === (task.taskType ?? '').toLowerCase());
  return (
    <View style={styles.taskCard}>
      <View style={[styles.taskCardAccent, { backgroundColor: type?.color ?? C.primary }]} />
      <View style={styles.taskCardBody}>
        <TouchableOpacity
          style={[styles.taskCircle, task.status === 'done' && { borderColor: C.green, backgroundColor: C.green }]}
          onPress={() => onToggle(task._id)}
        >
          {task.status === 'done' && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskTitle, task.status === 'done' && { textDecorationLine: 'line-through', color: C.lightGray }]}>
            {task.title}
          </Text>
          {task.description ? (
            <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
          ) : null}
          <View style={styles.taskMeta}>
            {task.dueDate && (
              <Text style={styles.taskTime}>🕐 {dayjs(task.dueDate).format('MMM D - h:mm A')}</Text>
            )}
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Create Task Modal ─────────────────────────────────────────────────────────
function CreateTaskModal({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    taskType: 'Work',
    priority: 'medium',
    dueDate: '',
    autoReminder: false,
    repeat: false,
    recurrence: 'daily',
  });

  const mutation = useMutation({
    mutationFn: () =>
      client.post('/tasks', {
        title: form.title,
        description: form.description,
        taskType: form.taskType,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        tags: [form.taskType.toLowerCase()],
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      setForm({ title: '', description: '', taskType: 'Work', priority: 'medium', dueDate: '', autoReminder: false, repeat: false, recurrence: 'daily' });
    },
    onError: () => Alert.alert('Error', 'Failed to create task'),
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Create a new task</Text>

          {/* Task Type */}
          <Text style={styles.fieldLabel}>Task Type</Text>
          <View style={styles.chipWrap}>
            {TASK_TYPES.map(t => (
              <TouchableOpacity
                key={t.label}
                style={[styles.chip, form.taskType === t.label && { backgroundColor: t.bg, borderColor: t.color }]}
                onPress={() => set('taskType', t.label)}
              >
                <View style={[styles.chipDot, { backgroundColor: t.color }]} />
                <Text style={[styles.chipText, form.taskType === t.label && { color: t.color, fontWeight: '600' }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Task title"
            placeholderTextColor={C.lightGray}
            value={form.title}
            onChangeText={v => set('title', v)}
          />

          {/* Detail */}
          <Text style={styles.fieldLabel}>Task Detail</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your task..."
            placeholderTextColor={C.lightGray}
            value={form.description}
            onChangeText={v => set('description', v)}
            multiline
            numberOfLines={3}
          />

          {/* Priority */}
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high'] as const).map(p => {
              const active = form.priority === p;
              const color = p === 'low' ? C.gray : p === 'medium' ? C.orange : C.red;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => set('priority', p)}
                >
                  <Text style={[styles.priorityBtnText, active && { color: '#fff' }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date & Time */}
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateIcon}>📅</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder={`e.g. ${dayjs().format('DD MMM, YYYY (HH:mm)')}`}
              placeholderTextColor={C.lightGray}
              value={form.dueDate}
              onChangeText={v => set('dueDate', v)}
            />
          </View>

          {/* Auto Reminder */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Auto Reminder</Text>
            <Switch
              value={form.autoReminder}
              onValueChange={v => set('autoReminder', v)}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Set as Repeat */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Set as Repeat</Text>
            <Switch
              value={form.repeat}
              onValueChange={v => set('repeat', v)}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>

          {form.repeat && (
            <View style={styles.repeatRow}>
              {(['Daily', 'Weekly', 'Monthly'] as const).map(r => {
                const active = form.recurrence === r.toLowerCase();
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.repeatBtn, active && styles.repeatBtnActive]}
                    onPress={() => set('recurrence', r.toLowerCase())}
                  >
                    <Text style={[styles.repeatBtnText, active && styles.repeatBtnTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 24 }} />

          <TouchableOpacity
            style={[styles.addTaskBtn, (!form.title || mutation.isPending) && { opacity: 0.6 }]}
            onPress={() => mutation.mutate()}
            disabled={!form.title || mutation.isPending}
          >
            <Text style={styles.addTaskBtnText}>
              {mutation.isPending ? 'Adding...' : 'Add Task'}
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

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'current' | 'upcoming'>('current');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => client.get('/tasks').then(r => r.data as { tasks: Task[] }),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => {
      const t = allTasks.find(x => x._id === id);
      const next = t?.status === 'done' ? 'todo' : 'done';
      return client.patch(`/tasks/${id}`, { status: next });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-tasks'] }),
  });

  const allTasks: Task[] = data?.tasks ?? [];
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const todayTasks = allTasks.filter(t => {
    if (!t.dueDate) return false;
    return dayjs(t.dueDate).isSame(dayjs(), 'day');
  });
  const currentTasks = allTasks.filter(t => t.status === 'in_progress' || t.status === 'todo');
  const upcomingTasks = allTasks.filter(t => {
    if (!t.dueDate) return false;
    return dayjs(t.dueDate).isAfter(dayjs(), 'day');
  });

  const displayTasks = tab === 'current' ? currentTasks : upcomingTasks;

  // Group by taskType
  const grouped: Record<string, Task[]> = {};
  displayTasks.forEach(t => {
    const group = t.taskType ?? 'General';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(t);
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>Welcome Back!! 👋</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Today's Task Card */}
        <View style={styles.todayCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.todayCheck}>
              <Text style={styles.todayCheckIcon}>✅</Text>
              <Text style={styles.todayCardTitle}>Today's Task</Text>
            </View>
            <Text style={styles.todayProgress}>
              {doneTasks.length}/{allTasks.length} tasks completed
            </Text>
            <Text style={styles.todayMotivation}>Let's conquer today's task—every step fuels you.</Text>
            <TouchableOpacity style={styles.viewTaskBtn}>
              <Text style={styles.viewTaskBtnText}>View Task</Text>
            </TouchableOpacity>
          </View>
          <ProgressCircle
            total={allTasks.length || 1}
            done={doneTasks.length}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'current' && styles.tabBtnActive]}
            onPress={() => setTab('current')}
          >
            <Text style={[styles.tabBtnText, tab === 'current' && styles.tabBtnTextActive]}>
              Current Task{' '}
              <Text style={[styles.tabCount, tab === 'current' && { backgroundColor: '#fff', color: C.primary }]}>
                {currentTasks.length}
              </Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'upcoming' && styles.tabBtnActive]}
            onPress={() => setTab('upcoming')}
          >
            <Text style={[styles.tabBtnText, tab === 'upcoming' && styles.tabBtnTextActive]}>
              Upcoming Task{' '}
              <Text style={[styles.tabCount, tab === 'upcoming' && { backgroundColor: '#fff', color: C.primary }]}>
                {upcomingTasks.length}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task Groups */}
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : Object.keys(grouped).length === 0 ? (
          <Text style={styles.emptyText}>No tasks here. Tap + to add one!</Text>
        ) : (
          Object.entries(grouped).map(([group, tasks]) => {
            const typeConfig = TASK_TYPES.find(t => t.label === group);
            return (
              <View key={group} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupLeft}>
                    <View style={[styles.groupDot, { backgroundColor: typeConfig?.color ?? C.primary }]} />
                    <Text style={styles.groupName}>{group}</Text>
                  </View>
                  <TouchableOpacity>
                    <Text style={[styles.viewAll, { color: C.primary }]}>View All {'>'}</Text>
                  </TouchableOpacity>
                </View>
                {tasks.map(t => (
                  <TaskCard key={t._id} task={t} onToggle={id => updateMutation.mutate(id)} />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <CreateTaskModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ['dashboard-tasks'] })}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.dark },
  headerSub: { fontSize: 13, color: C.gray, marginTop: 2 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  // Today Card
  todayCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.primary, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayCheck: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  todayCheckIcon: { fontSize: 16 },
  todayCardTitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  todayProgress: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  todayMotivation: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 16, marginBottom: 12 },
  viewTaskBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start' },
  viewTaskBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: C.primaryLight, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.primary },
  tabBtnText: { fontSize: 13, color: C.gray, fontWeight: '500' },
  tabBtnTextActive: { color: '#fff', fontWeight: '700' },
  tabCount: { fontSize: 11, fontWeight: '700' },

  // Task Groups
  group: { marginHorizontal: 16, marginBottom: 8 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  groupLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupName: { fontSize: 15, fontWeight: '600', color: C.dark },
  viewAll: { fontSize: 13, fontWeight: '500' },

  // Task Card
  taskCard: { backgroundColor: C.white, borderRadius: 14, marginBottom: 8, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  taskCardAccent: { width: 4 },
  taskCardBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  taskCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: C.dark, marginBottom: 2 },
  taskDesc: { fontSize: 12, color: C.gray, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  taskTime: { fontSize: 11, color: C.lightGray },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '500' },

  // FAB
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  // Empty
  emptyText: { textAlign: 'center', color: C.lightGray, marginTop: 48, fontSize: 15, lineHeight: 22 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.dark, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.dark, marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },

  // Chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: '#F9FAFB' },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, color: C.gray },

  // Priority
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', backgroundColor: '#F9FAFB' },
  priorityBtnText: { fontSize: 13, color: C.gray, fontWeight: '500' },

  // Date row
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dateIcon: { fontSize: 18 },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border },
  toggleLabel: { fontSize: 14, color: C.dark, fontWeight: '500' },

  // Repeat buttons
  repeatRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  repeatBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  repeatBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  repeatBtnText: { fontSize: 13, color: C.gray },
  repeatBtnTextActive: { color: '#fff', fontWeight: '600' },

  // Add Task button
  addTaskBtn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  addTaskBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { color: C.gray, fontSize: 14 },
});
