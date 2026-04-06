import React, { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import client from '../../api/client';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

interface Analytics {
  byCategory: Array<{ _id: string; total: number; count: number }>;
  byMonth: Array<{ _id: { year: number; month: number }; total: number }>;
  total: number;
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics' | 'transactions'>('upload');

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => client.get('/expenses').then((r) => r.data),
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['expense-analytics'],
    queryFn: () => client.get('/expenses/analytics').then((r) => r.data),
    enabled: activeTab === 'analytics',
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => client.get('/expenses/transactions').then((r) => r.data),
    enabled: activeTab === 'transactions',
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      client.post('/expenses/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    uploadMutation.mutate(formData);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const monthlyData = analytics?.byMonth?.map((m) => ({
    name: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
    total: m.total,
  })).reverse() ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
        <div className="flex gap-2">
          {['upload', 'analytics', 'transactions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-4xl mb-3">📄</p>
            {uploadMutation.isPending ? (
              <p className="text-gray-600 font-medium">Uploading and parsing PDF...</p>
            ) : isDragActive ? (
              <p className="text-indigo-600 font-medium">Drop your bank statement PDF here</p>
            ) : (
              <>
                <p className="text-gray-600 font-medium">Drag & drop your bank statement PDF</p>
                <p className="text-gray-400 text-sm mt-1">or click to browse (max 10MB)</p>
              </>
            )}
            {uploadMutation.isSuccess && (
              <p className="text-green-600 mt-3 text-sm">✓ Upload successful! Processing in background...</p>
            )}
            {uploadMutation.isError && (
              <p className="text-red-600 mt-3 text-sm">Upload failed. Please try again.</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Reports</h2>
            {expensesLoading ? (
              <p className="text-gray-400">Loading...</p>
            ) : Array.isArray(expenses) && expenses.length > 0 ? (
              <div className="space-y-2">
                {(expenses as any[]).map((e: any) => (
                  <div key={e._id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{e.originalName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(e.createdAt).toLocaleDateString()} · {e.transactionCount} transactions · ${e.totalAmount?.toFixed(2)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      e.status === 'processed' ? 'bg-green-100 text-green-700' :
                      e.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No expense reports yet. Upload a PDF to get started.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-1">Total Spending</h2>
            <p className="text-3xl font-bold text-indigo-600">${analytics.total?.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">By Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={analytics.byCategory} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={(e) => e._id}>
                  {analytics.byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Monthly Spending</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Description', 'Category', 'Amount', 'Type'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(transactions) && (transactions as any[]).map((t: any) => (
                <tr key={t._id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-800">{t.description}</td>
                  <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{t.category}</span></td>
                  <td className={`px-4 py-3 font-medium ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'credit' ? '+' : '-'}${t.amount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-500">{t.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!transactions || (transactions as any[]).length === 0) && (
            <p className="text-center text-gray-400 py-12">No transactions found. Upload a bank statement first.</p>
          )}
        </div>
      )}
    </div>
  );
}
