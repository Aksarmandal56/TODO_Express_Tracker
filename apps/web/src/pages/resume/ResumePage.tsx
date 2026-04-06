import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

interface Resume {
  _id: string;
  title: string;
  personalInfo: { fullName: string; email: string; summary?: string };
  experience: Array<{ company: string; position: string }>;
  education: Array<{ institution: string; degree: string }>;
  skills: Array<{ category: string; items: string[] }>;
  createdAt: string;
  updatedAt: string;
}

interface Enhancement {
  enhancedSummary: string;
  improvedBullets: string[];
  suggestedSkills: string[];
  atsScore: number;
  suggestions: string[];
}

function ResumeCard({ resume, onEnhance }: { resume: Resume; onEnhance: (id: string) => void }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{resume.title}</h3>
          <p className="text-sm text-gray-500">{resume.personalInfo.fullName} · {resume.personalInfo.email}</p>
          <p className="text-xs text-gray-400 mt-1">Updated {new Date(resume.updatedAt).toLocaleDateString()}</p>
        </div>
        <button
          onClick={() => onEnhance(resume._id)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
        >
          ✨ Enhance with AI
        </button>
      </div>
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span>{resume.experience.length} experience</span>
        <span>{resume.education.length} education</span>
        <span>{resume.skills.length} skill categories</span>
      </div>
    </div>
  );
}

function CreateResumeForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    linkedin: '',
    github: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => client.post('/resume', data).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['resumes'] }); onClose(); },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      title: form.title,
      personalInfo: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        location: form.location,
        summary: form.summary,
        linkedin: form.linkedin,
        github: form.github,
      },
    });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
      <h2 className="text-lg font-semibold mb-4">Create New Resume</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Resume title *" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Full name *" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email *" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="LinkedIn URL" value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="GitHub URL" value={form.github} onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))} />
        </div>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Professional summary" rows={3} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create Resume'}
          </button>
          <button type="button" onClick={onClose} className="border border-gray-300 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function EnhancementResult({ data, onClose }: { data: { enhancement: Enhancement }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">AI Enhancement Results</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">ATS Score</h3>
              <span className="text-2xl font-bold text-indigo-600">{data.enhancement.atsScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${data.enhancement.atsScore}%` }} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Enhanced Summary</h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{data.enhancement.enhancedSummary}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Improved Bullet Points</h3>
            <ul className="space-y-1">
              {data.enhancement.improvedBullets.map((b, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-indigo-500">•</span>{b}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Suggested Skills to Add</h3>
            <div className="flex flex-wrap gap-2">
              {data.enhancement.suggestedSkills.map((s) => (
                <span key={s} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{s}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Improvement Suggestions</h3>
            <ul className="space-y-1">
              {data.enhancement.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-green-500">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<any>(null);

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => client.get('/resume').then((r) => r.data as Resume[]),
  });

  const enhanceMutation = useMutation({
    mutationFn: (id: string) => client.post(`/resume/${id}/enhance`).then((r) => r.data),
    onSuccess: (data) => setEnhancementResult(data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Resume Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Powered by Claude AI</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ New Resume'}
        </button>
      </div>

      {showForm && <CreateResumeForm onClose={() => setShowForm(false)} />}

      {enhanceMutation.isPending && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4 text-center">
          <p className="text-indigo-700 font-medium">✨ Claude AI is analyzing your resume...</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading resumes...</div>
      ) : Array.isArray(resumes) && resumes.length > 0 ? (
        <div className="space-y-4">
          {resumes.map((resume) => (
            <ResumeCard key={resume._id} resume={resume} onEnhance={(id) => enhanceMutation.mutate(id)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p>No resumes yet. Create your first AI-powered resume!</p>
        </div>
      )}

      {enhancementResult && (
        <EnhancementResult data={enhancementResult} onClose={() => setEnhancementResult(null)} />
      )}
    </div>
  );
}
