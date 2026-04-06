import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import client from '../../api/client';

function StatCard({ title, value, color, href }: { title: string; value: number | string; color: string; href: string }) {
  return (
    <Link to={href} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const { data: taskStats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => client.get('/tasks/stats').then((r) => r.data),
  });

  const { data: upcomingReminders } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: () => client.get('/reminders/upcoming?days=7').then((r) => r.data),
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => client.get('/expenses').then((r) => r.data),
  });

  const totalTasks = taskStats
    ? Object.values(taskStats as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening today</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Tasks" value={totalTasks} color="text-indigo-600" href="/tasks" />
        <StatCard
          title="In Progress"
          value={taskStats?.in_progress ?? 0}
          color="text-yellow-600"
          href="/tasks"
        />
        <StatCard
          title="Upcoming Reminders"
          value={Array.isArray(upcomingReminders) ? upcomingReminders.length : 0}
          color="text-green-600"
          href="/reminders"
        />
        <StatCard
          title="Expense Reports"
          value={Array.isArray(expenses) ? expenses.length : 0}
          color="text-purple-600"
          href="/expenses"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Task Status</h2>
          {taskStats ? (
            <div className="space-y-3">
              {Object.entries(taskStats as Record<string, number>).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                  <span className="font-semibold text-indigo-600">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No tasks yet. <Link to="/tasks" className="text-indigo-600">Create one →</Link></p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Reminders</h2>
          {Array.isArray(upcomingReminders) && upcomingReminders.length > 0 ? (
            <div className="space-y-3">
              {upcomingReminders.slice(0, 5).map((r: any) => (
                <div key={r._id} className="flex justify-between items-start">
                  <span className="text-gray-700 text-sm">{r.title}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(r.datetime).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No upcoming reminders. <Link to="/reminders" className="text-indigo-600">Add one →</Link></p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'AI Resume Builder', desc: 'Create and enhance your resume with Claude AI', href: '/resume', color: 'bg-indigo-50 text-indigo-700' },
          { title: 'Document Converter', desc: 'Convert DOCX, MD, HTML files to PDF', href: '/converter', color: 'bg-purple-50 text-purple-700' },
          { title: 'Expense Tracker', desc: 'Upload bank statements and track spending', href: '/expenses', color: 'bg-green-50 text-green-700' },
        ].map((item) => (
          <Link key={item.href} to={item.href} className={`${item.color} rounded-xl p-5 hover:opacity-90 transition-opacity`}>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm mt-1 opacity-80">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
