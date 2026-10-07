import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  File,
} from 'lucide-react';
import { DocumentMetadata } from '@/lib/types';

interface DocumentUploadProps {
  onDocumentLoaded: (metadata: DocumentMetadata) => void;
  onReset: () => void;
  currentDocument: DocumentMetadata | null;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onDocumentLoaded,
  onReset,
  currentDocument,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // Validate size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit. Please upload a smaller file.');
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setErrorMessage('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const savedKey = typeof window !== 'undefined' ? localStorage.getItem('llm_api_key') : null;
    const savedProvider = typeof window !== 'undefined' ? localStorage.getItem('llm_provider') || 'openai' : 'openai';
    if (savedKey) {
      formData.append('apiKey', savedKey);
      formData.append('provider', savedProvider);
    }

    try {
      // Step 1: Uploading
      setUploadStep('Uploading file...');
      setProgressPercent(25);

      // Step 2: Extraction simulation progress step
      const stepTimer1 = setTimeout(() => {
        setUploadStep('Extracting text & page layout...');
        setProgressPercent(50);
      }, 500);

      // Step 3: Embeddings
      const stepTimer2 = setTimeout(() => {
        setUploadStep('Generating embeddings & indexing chunks...');
        setProgressPercent(80);
      }, 1200);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse and index document.');
      }

      setProgressPercent(100);
      setUploadStep('Ready');
      setTimeout(() => {
        setUploadStep(null);
        onDocumentLoaded(data.metadata);
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload.');
      setUploadStep(null);
      setProgressPercent(0);
    }
  };

  return (
    <div className="w-full">
      {!currentDocument ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploadStep && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-400 bg-white/70 hover:bg-slate-50/50'
          } ${uploadStep ? 'pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploadStep ? (
            <div className="w-full max-w-sm flex flex-col items-center py-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-800 mb-2">{uploadStep}</p>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 mt-2">{progressPercent}% complete</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4 shadow-sm border border-blue-100">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                Drag & drop your document here
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Supports <span className="font-medium text-slate-700">PDF, DOCX, TXT</span> up to 25MB
              </p>
              <span className="px-3.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Browse Files
              </span>
            </>
          )}

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      ) : (
        /* Document Metadata Card */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                <File className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 truncate" title={currentDocument.name}>
                    {currentDocument.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{formatFileSize(currentDocument.size)}</span>
                  <span>•</span>
                  <span>{currentDocument.pageCount} {currentDocument.pageCount === 1 ? 'Page' : 'Pages'}</span>
                  <span>•</span>
                  <span>{currentDocument.chunkCount} Chunks indexed</span>
                </div>
              </div>
            </div>

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change Document</span>
            </button>
          </div>

          {/* Scanned PDF warning alert */}
          {currentDocument.isScannedWarning && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Notice: Low text density detected.</span>
                <p className="mt-0.5 text-amber-700">
                  If this is a scanned PDF image with unextracted text, direct answers may be limited. An OCR preprocessing step is recommended for scanned image files.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
