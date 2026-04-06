import React, { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import client from '../../api/client';

const SUPPORTED_FORMATS = ['.docx', '.txt', '.md', '.html'];

interface ConversionJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputPath?: string;
  error?: string;
}

export default function ConverterPage() {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [polling, setPolling] = useState<Record<string, NodeJS.Timeout>>({});

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      client.post('/converter/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data as ConversionJob),
    onSuccess: (job) => {
      setJobs((prev) => [job, ...prev]);
      startPolling(job.jobId);
    },
  });

  const startPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await client.get(`/converter/status/${jobId}`);
        const updatedJob: ConversionJob = response.data;

        setJobs((prev) => prev.map((j) => (j.jobId === jobId ? updatedJob : j)));

        if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
          clearInterval(interval);
          setPolling((prev) => {
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);

    setPolling((prev) => ({ ...prev, [jobId]: interval }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    uploadMutation.mutate(formData);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
  });

  const statusColors: Record<string, string> = {
    queued: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Converter</h1>
        <p className="text-gray-500 text-sm mt-1">Convert DOCX, TXT, Markdown, and HTML files to PDF</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors mb-8 ${
          isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-5xl mb-4">📝</p>
        {uploadMutation.isPending ? (
          <div>
            <p className="text-gray-700 font-semibold">Uploading...</p>
            <div className="mt-2 w-32 mx-auto h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 animate-pulse w-full" />
            </div>
          </div>
        ) : isDragActive ? (
          <p className="text-indigo-600 font-semibold text-lg">Drop your document here</p>
        ) : (
          <div>
            <p className="text-gray-700 font-semibold text-lg">Drag & drop a document to convert</p>
            <p className="text-gray-400 mt-1">Supported: {SUPPORTED_FORMATS.join(', ')}</p>
            <p className="text-gray-400 text-sm">Max size: 25MB</p>
          </div>
        )}
      </div>

      {uploadMutation.isError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          Upload failed. Please ensure your file is one of the supported formats.
        </div>
      )}

      {jobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Conversion Jobs</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.jobId} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">Job ID: {job.jobId}</p>
                  {job.error && <p className="text-red-600 text-xs mt-0.5">{job.error}</p>}
                  {job.status === 'completed' && job.outputPath && (
                    <p className="text-green-600 text-xs mt-0.5">✓ Conversion complete</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {job.status === 'processing' && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[job.status] || ''}`}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Supported Conversions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { from: '.docx', icon: '📘', label: 'Word Document' },
            { from: '.txt', icon: '📄', label: 'Plain Text' },
            { from: '.md', icon: '📝', label: 'Markdown' },
            { from: '.html', icon: '🌐', label: 'HTML' },
          ].map(({ from, icon, label }) => (
            <div key={from} className="bg-white rounded-lg p-3 text-center border border-gray-100">
              <p className="text-2xl">{icon}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">{from}</p>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-xs text-indigo-500 mt-1">→ PDF</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
