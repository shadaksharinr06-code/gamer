'use client';

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Globe2,
  Layers,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { DocumentMetadata } from '@/lib/types';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<DocumentMetadata | null>(null);

  const handleDocumentLoaded = (metadata: DocumentMetadata) => {
    setCurrentDocument(metadata);
  };

  const handleResetSession = async () => {
    if (currentDocument?.id) {
      try {
        await fetch('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentDocument.id }),
        });
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
    setCurrentDocument(null);
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              DocuDual RAG
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Dual Output
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Zero-Hallucination Direct Document Grounding + Supplemental World Knowledge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentDocument && (
            <button
              onClick={handleResetSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Architecture & Dual Response Explainer Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">1. Grounded In Document</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Answers derived exclusively from retrieved chunks with exact page & paragraph citations.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">2. Supplemental Insights</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                AI world knowledge for broader industry context, best practices, and comparative analysis.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">3. RAG Pipeline Spec</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Chunk size: 1000 chars, Overlap: 150 chars. In-memory cosine search & structured JSON schema.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <section>
          <DocumentUpload
            currentDocument={currentDocument}
            onDocumentLoaded={handleDocumentLoaded}
            onReset={handleResetSession}
          />
        </section>

        {/* Interactive Chat Console */}
        <section className="flex-1 min-h-[560px] flex flex-col">
          <ChatInterface
            document={currentDocument}
            onResetSession={handleResetSession}
          />
        </section>
      </div>
    </main>
  );
}
