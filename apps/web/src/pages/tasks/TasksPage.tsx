import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import client from '../../api/client';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
  { id: 'in_review', label: 'In Review', color: 'bg-yellow-50' },
  { id: 'done', label: 'Done', color: 'bg-green-50' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 flex-1">{task.title}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      {task.dueDate && (
        <p className="text-xs text-gray-400 mt-2">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </p>
      )}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTaskModal({ onClose, defaultStatus }: { onClose: () => void; defaultStatus: TaskStatus }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as TaskPriority, status: defaultStatus, dueDate: '', tags: '' });

  const mutation = useMutation({
    mutationFn: (data: any) => client.post('/tasks', data).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['board'] }); onClose(); },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [] });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create Task</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Task title *" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');

  const { data: board, isLoading } = useQuery({
    queryKey: ['board'],
    queryFn: () => client.get('/tasks/board').then((r) => r.data as Record<TaskStatus, Task[]>),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      client.patch(`/tasks/${id}`, { status }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board'] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which column the drop target belongs to
    const targetColumn = COLUMNS.find((col) =>
      board?.[col.id]?.some((t) => t._id === over.id) || col.id === over.id,
    );

    if (targetColumn) {
      updateMutation.mutate({ id: active.id as string, status: targetColumn.id });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading board...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
        <button
          onClick={() => { setDefaultStatus('todo'); setShowModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + New Task
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className={`${col.color} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700">{col.label}</h2>
                <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  {board?.[col.id]?.length ?? 0}
                </span>
              </div>
              <SortableContext
                items={(board?.[col.id] ?? []).map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 min-h-[100px]">
                  {(board?.[col.id] ?? []).map((task) => (
                    <TaskCard key={task._id} task={task} />
                  ))}
                </div>
              </SortableContext>
              <button
                onClick={() => { setDefaultStatus(col.id); setShowModal(true); }}
                className="mt-3 w-full text-gray-400 hover:text-gray-600 text-sm py-1 hover:bg-white/50 rounded-lg transition-colors"
              >
                + Add task
              </button>
            </div>
          ))}
        </div>
      </DndContext>

      {showModal && <CreateTaskModal onClose={() => setShowModal(false)} defaultStatus={defaultStatus} />}
    </div>
  );
}
