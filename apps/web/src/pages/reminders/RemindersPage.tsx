import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  datetime: string;
  recurrence: string;
  notified: boolean;
  isActive: boolean;
}

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

function ReminderCard({ reminder, onDelete }: { reminder: Reminder; onDelete: (id: string) => void }) {
  const isPast = new Date(reminder.datetime) < new Date();
  const isToday = new Date(reminder.datetime).toDateString() === new Date().toDateString();

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border ${isToday ? 'border-indigo-300' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">{reminder.title}</h3>
            {isToday && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">Today</span>}
            {reminder.notified && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Sent</span>}
          </div>
          {reminder.description && (
            <p className="text-sm text-gray-500 mt-1">{reminder.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>📅 {new Date(reminder.datetime).toLocaleString()}</span>
            {reminder.recurrence !== 'none' && (
              <span className="capitalize">🔁 {reminder.recurrence}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(reminder._id)}
          className="text-gray-300 hover:text-red-500 transition-colors ml-2 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', datetime: '', recurrence: 'none' });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => client.get('/reminders').then((r) => r.data as Reminder[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => client.post('/reminders', { ...data, datetime: new Date(data.datetime).toISOString() }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reminders'] }); setShowForm(false); setForm({ title: '', description: '', datetime: '', recurrence: 'none' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/reminders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const upcoming = reminders?.filter((r) => new Date(r.datetime) >= new Date()).slice(0, 5) ?? [];
  const past = reminders?.filter((r) => new Date(r.datetime) < new Date()) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ New Reminder'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Reminder</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
            className="space-y-3"
          >
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Reminder title *"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Description (optional)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                  value={form.datetime}
                  onChange={(e) => setForm((f) => ({ ...f, datetime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recurrence</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.recurrence}
                  onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                >
                  {RECURRENCE_OPTIONS.map((r) => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Reminder'}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading reminders...</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((r) => (
                  <ReminderCard key={r._id} reminder={r} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-3 opacity-60">
                {past.slice(0, 10).map((r) => (
                  <ReminderCard key={r._id} reminder={r} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}

          {(!reminders || reminders.length === 0) && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔔</p>
              <p>No reminders yet. Create your first one!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
