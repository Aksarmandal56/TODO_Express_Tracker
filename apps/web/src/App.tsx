import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const RemindersPage = lazy(() => import('./pages/reminders/RemindersPage'));
const ExpensesPage = lazy(() => import('./pages/expenses/ExpensesPage'));
const ResumePage = lazy(() => import('./pages/resume/ResumePage'));
const ConverterPage = lazy(() => import('./pages/converter/ConverterPage'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-indigo-600">TODO SaaS</span>
        <div className="flex gap-4 text-sm">
          <a href="/dashboard" className="text-gray-600 hover:text-indigo-600">Dashboard</a>
          <a href="/tasks" className="text-gray-600 hover:text-indigo-600">Tasks</a>
          <a href="/reminders" className="text-gray-600 hover:text-indigo-600">Reminders</a>
          <a href="/expenses" className="text-gray-600 hover:text-indigo-600">Expenses</a>
          <a href="/resume" className="text-gray-600 hover:text-indigo-600">Resume</a>
          <a href="/converter" className="text-gray-600 hover:text-indigo-600">Converter</a>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><AppLayout><TasksPage /></AppLayout></PrivateRoute>} />
          <Route path="/reminders" element={<PrivateRoute><AppLayout><RemindersPage /></AppLayout></PrivateRoute>} />
          <Route path="/expenses" element={<PrivateRoute><AppLayout><ExpensesPage /></AppLayout></PrivateRoute>} />
          <Route path="/resume" element={<PrivateRoute><AppLayout><ResumePage /></AppLayout></PrivateRoute>} />
          <Route path="/converter" element={<PrivateRoute><AppLayout><ConverterPage /></AppLayout></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
