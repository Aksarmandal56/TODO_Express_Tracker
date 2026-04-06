import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  tags: string[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#e5e7eb',
  in_progress: '#dbeafe',
  in_review: '#fef3c7',
  done: '#d1fae5',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9ca3af',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

function TaskItem({ task, onUpdate }: { task: Task; onUpdate: (id: string, status: string) => void }) {
  return (
    <View style={[styles.taskCard, { borderLeftColor: PRIORITY_COLORS[task.priority] }]}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[task.status] }]}>
          <Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text>
        </View>
      </View>
      {task.description && <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>}
      {task.dueDate && (
        <Text style={styles.dueDate}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
      )}
      <View style={styles.quickActions}>
        {task.status !== 'done' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => onUpdate(task._id, 'done')}
          >
            <Text style={styles.completeBtnText}>Mark Done</Text>
          </TouchableOpacity>
        )}
        {task.status === 'todo' && (
          <TouchableOpacity
            style={[styles.completeBtn, { backgroundColor: '#dbeafe' }]}
            onPress={() => onUpdate(task._id, 'in_progress')}
          >
            <Text style={[styles.completeBtnText, { color: '#1d4ed8' }]}>Start</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks-mobile', filter],
    queryFn: () => {
      const params = filter ? `?status=${filter}` : '';
      return client.get(`/tasks${params}`).then((r) => r.data as { tasks: Task[] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (task: typeof newTask) => client.post('/tasks', task).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-mobile'] });
      setShowModal(false);
      setNewTask({ title: '', description: '', priority: 'medium' });
    },
    onError: () => Alert.alert('Error', 'Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      client.patch(`/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-mobile'] }),
  });

  const filters = [null, 'todo', 'in_progress', 'in_review', 'done'];

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f ?? 'all'}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f ? f.replace('_', ' ') : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={data?.tasks ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TaskItem task={item} onUpdate={(id, status) => updateMutation.mutate({ id, status })} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tasks found. Create your first task!</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>New Task</Text>
          <TextInput
            style={styles.input}
            placeholder="Task title *"
            value={newTask.title}
            onChangeText={(t) => setNewTask((f) => ({ ...f, title: t }))}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={newTask.description}
            onChangeText={(t) => setNewTask((f) => ({ ...f, description: t }))}
            multiline
            numberOfLines={3}
          />
          <View style={styles.priorityRow}>
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityBtn, newTask.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '33', borderColor: PRIORITY_COLORS[p] }]}
                onPress={() => setNewTask((f) => ({ ...f, priority: p }))}
              >
                <Text style={[styles.priorityText, newTask.priority === p && { color: PRIORITY_COLORS[p] }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => createMutation.mutate(newTask)}
              disabled={!newTask.title || createMutation.isPending}
            >
              <Text style={styles.submitBtnText}>{createMutation.isPending ? 'Creating...' : 'Create Task'}</Text>
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterBtnActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, color: '#374151', textTransform: 'capitalize' },
  taskDesc: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  dueDate: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  completeBtn: { backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  completeBtnText: { color: '#065f46', fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  modal: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  priorityText: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' },
  modalActions: { gap: 10 },
  submitBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { color: '#6b7280', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 15 },
});
