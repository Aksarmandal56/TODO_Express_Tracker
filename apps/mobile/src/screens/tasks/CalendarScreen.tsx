import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

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

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

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
  };
  const c = cfg[status] ?? cfg.todo;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// Build a calendar grid (Mon-start, 6 rows max)
function buildCalendarDays(month: Dayjs): (Dayjs | null)[] {
  const start = month.startOf('month');
  const end = month.endOf('month');
  // dayjs weekday: 0=Sun…6=Sat. We want Mon=0.
  const startDow = (start.day() + 6) % 7; // 0=Mon
  const days: (Dayjs | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  let d = start;
  while (d.isSameOrBefore(end, 'day')) {
    days.push(d);
    d = d.add(1, 'day');
  }
  // Pad to full rows of 7
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

// Group tasks by date label
function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const key = dayjs(t.dueDate).format('YYYY-MM-DD');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  return grouped;
}

function TaskRow({
  task,
  onReschedule,
}: {
  task: Task;
  onReschedule?: () => void;
}) {
  return (
    <View style={styles.taskRow}>
      <TouchableOpacity style={styles.taskCircle}>
        {task.status === 'done' && <Text style={{ color: C.green, fontSize: 10 }}>✓</Text>}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
        ) : null}
        <View style={styles.taskMeta}>
          {task.dueDate && (
            <Text style={styles.taskTime}>
              🕐 {dayjs(task.dueDate).format('h:mm A')}
            </Text>
          )}
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </View>
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const today = dayjs().format('YYYY-MM-DD');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks-calendar'],
    queryFn: () => client.get('/tasks').then(r => r.data as { tasks: Task[] }),
  });

  const qc = useQueryClient();
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string }) =>
      client.patch(`/tasks/${id}`, { dueDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-calendar'] }),
  });

  const allTasks: Task[] = data?.tasks ?? [];
  const grouped = groupTasksByDate(allTasks);
  const calDays = buildCalendarDays(currentMonth);

  const now = dayjs();
  const overdueTasks = allTasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return dayjs(t.dueDate).isBefore(now, 'day');
  });

  // Tasks for selected date
  const selectedTasks = grouped[selectedDate] ?? [];
  // Date label
  const dateLabel = dayjs(selectedDate).isSame(now, 'day')
    ? `${dayjs(selectedDate).format('dddd, MMM D')} • Today`
    : dayjs(selectedDate).format('dddd, MMM D');

  // Days with tasks (for dots)
  const daysWithTasks = new Set(Object.keys(grouped));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentMonth(m => m.subtract(1, 'month'))}>
          <Text style={styles.navArrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Month/Year Row */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => setCurrentMonth(m => m.subtract(1, 'month'))}>
            <Text style={styles.monthNavBtn}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.monthLabel}>
            <Text style={styles.monthText}>{currentMonth.format('MMMM YYYY')}</Text>
            <Text style={styles.monthChevron}> ∧</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentMonth(m => m.add(1, 'month'))}>
            <Text style={styles.monthNavBtn}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarCard}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map(d => (
              <View key={d} style={styles.weekCell}>
                <Text style={[styles.weekDayText, (d === 'Sa' || d === 'Su') && { color: C.red }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {Array.from({ length: calDays.length / 7 }, (_, row) => (
            <View key={row} style={styles.weekRow}>
              {calDays.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} style={styles.weekCell} />;
                const key = day.format('YYYY-MM-DD');
                const isToday = key === today;
                const isSelected = key === selectedDate;
                const hasTasks = daysWithTasks.has(key);
                const isWeekend = col >= 5; // Sa=5, Su=6
                return (
                  <TouchableOpacity
                    key={col}
                    style={styles.weekCell}
                    onPress={() => setSelectedDate(key)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.dayCircle,
                      isToday && styles.todayCircle,
                      isSelected && !isToday && styles.selectedCircle,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        isWeekend && { color: C.red },
                        (isToday || isSelected) && { color: '#fff', fontWeight: '700' },
                      ]}>
                        {day.date()}
                      </Text>
                    </View>
                    {hasTasks && !isSelected && (
                      <View style={styles.taskDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overdue</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Reschedule All', 'Move all overdue tasks to today?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reschedule',
                      onPress: () =>
                        overdueTasks.forEach(t =>
                          rescheduleMutation.mutate({ id: t._id, dueDate: new Date().toISOString() })
                        ),
                    },
                  ])
                }
              >
                <Text style={styles.rescheduleText}>Reschedule ›</Text>
              </TouchableOpacity>
            </View>
            {overdueTasks.map(t => (
              <View key={t._id} style={styles.taskCard}>
                <TaskRow task={t} />
              </View>
            ))}
          </View>
        )}

        {/* Selected Date Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{dateLabel}</Text>
            {selectedTasks.length > 0 && (
              <TouchableOpacity>
                <Text style={[styles.rescheduleText, { color: C.primary }]}>View All ›</Text>
              </TouchableOpacity>
            )}
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : selectedTasks.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayText}>No tasks on this day</Text>
            </View>
          ) : (
            selectedTasks.map(t => (
              <View key={t._id} style={styles.taskCard}>
                <TaskRow task={t} />
              </View>
            ))
          )}
        </View>

        {/* All upcoming days with tasks */}
        {Object.entries(grouped)
          .filter(([key]) => key !== selectedDate && dayjs(key).isAfter(now, 'day'))
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .slice(0, 5)
          .map(([key, tasks]) => {
            const dayLabel = dayjs(key).isSame(now, 'day')
              ? `${dayjs(key).format('dddd, MMM D')} • Today`
              : dayjs(key).format('dddd, MMM D');
            return (
              <View key={key} style={styles.section}>
                <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{dayLabel}</Text>
                {tasks.map(t => (
                  <View key={t._id} style={styles.taskCard}>
                    <TaskRow task={t} />
                  </View>
                ))}
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.dark },
  navArrow: { fontSize: 16, color: C.gray, paddingHorizontal: 8 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  monthNavBtn: { fontSize: 24, color: C.gray, paddingHorizontal: 8 },
  monthLabel: { flexDirection: 'row', alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '600', color: C.dark },
  monthChevron: { fontSize: 14, color: C.gray },

  calendarCard: { backgroundColor: C.white, marginHorizontal: 16, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 16 },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekDayText: { fontSize: 12, color: C.gray, fontWeight: '600' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: C.primary },
  selectedCircle: { backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.primary },
  dayText: { fontSize: 13, color: C.dark },
  taskDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary, marginTop: 2 },

  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.dark },
  rescheduleText: { fontSize: 13, color: C.orange, fontWeight: '500' },

  taskCard: { backgroundColor: C.white, borderRadius: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  taskCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: C.dark, marginBottom: 2 },
  taskDesc: { fontSize: 12, color: C.gray, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  taskTime: { fontSize: 11, color: C.lightGray },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '500' },

  emptyDay: { backgroundColor: C.white, borderRadius: 14, padding: 20, alignItems: 'center' },
  emptyDayText: { color: C.lightGray, fontSize: 14 },
});
