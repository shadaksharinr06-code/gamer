import React, { useState } from 'react';
import {
  FileText,
  Globe2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  Columns,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { DualRAGResponse, DocumentChunk } from '@/lib/types';
import { SourceInspectorModal } from './SourceInspectorModal';

interface DualResponseCardProps {
  response: DualRAGResponse;
  retrievedChunks?: DocumentChunk[];
  defaultView?: 'split' | 'tabs';
}

export const DualResponseCard: React.FC<DualResponseCardProps> = ({
  response,
  retrievedChunks = [],
  defaultView = 'split',
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'supplemental'>('document');
  const [viewMode, setViewMode] = useState<'split' | 'tabs'>(defaultView);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'doc' | 'supp' | null>(null);

  const isNotFound = response.document_grounded_answer
    .toLowerCase()
    .includes('this specific information was not found in the uploaded document');

  const copyToClipboard = (text: string, type: 'doc' | 'supp') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCitationClick = (citation: string) => {
    setSelectedCitation(citation);
    setIsInspectorOpen(true);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Top action bar: Layout switcher */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/70 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Dual RAG Synthesis</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-200/60 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Side-by-side comparison"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split Columns</span>
          </button>
          <button
            onClick={() => setViewMode('tabs')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'tabs'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tabbed view"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabs</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar (Only when in tabs mode) */}
      {viewMode === 'tabs' && (
        <div className="flex border-b border-slate-200 bg-slate-50/40">
          <button
            onClick={() => setActiveTab('document')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'document'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>From Your Document</span>
            {response.citations.length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[10px]">
                {response.citations.length} citations
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('supplemental')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'supplemental'
                ? 'border-purple-600 text-purple-700 bg-purple-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <Globe2 className="w-4 h-4 text-purple-600" />
            <span>Supplemental Insights</span>
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px]">
              World AI
            </span>
          </button>
        </div>
      )}

      {/* Body Content */}
      <div className={viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200' : ''}>
        {/* SECTION A: DIRECT DOCUMENT ANSWER */}
        {(viewMode === 'split' || activeTab === 'document') && (
          <div className="p-5 flex flex-col justify-between bg-white">
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      From Your Document
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      100% Grounded in uploaded context
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(response.document_grounded_answer, 'doc')}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Copy response"
                  >
                    {copiedType === 'doc' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {retrievedChunks.length > 0 && (
                    <button
                      onClick={() => setIsInspectorOpen(true)}
                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      title="Inspect context chunks"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Inspect Context</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grounded Answer Text */}
              {isNotFound ? (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 my-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">
                      Information Not in Document
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      This specific information was not found in the uploaded document. Check the Supplemental Insights column for general domain knowledge.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-line font-sans">
                  {response.document_grounded_answer}
                </div>
              )}
            </div>

            {/* Citations Footer */}
            {response.citations && response.citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Verified Citations
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {response.citations.map((cite, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => handleCitationClick(cite)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                    >
                      <span>[{cite}]</span>
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: SUPPLEMENTAL / WORLD KNOWLEDGE ANSWER */}
        {(viewMode === 'split' || activeTab === 'supplemental') && (
          <div className="p-5 flex flex-col justify-between bg-purple-50/20">
            <div>
              {/* Header Badge & Warning */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                      Supplemental Insights
                    </h4>
                    <span className="text-[11px] text-purple-600/80">
                      Broader background & world context
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(response.supplemental_knowledge_answer, 'supp')}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Copy response"
                >
                  {copiedType === 'supp' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* World Knowledge Disclaimer Chip */}
              <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-purple-100/70 border border-purple-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span className="text-[11px] font-medium text-purple-800">
                  Generated from AI world knowledge, not found directly in document.
                </span>
              </div>

              {/* Supplemental Answer Text */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 whitespace-pre-line font-sans">
                {response.supplemental_knowledge_answer}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-100/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>External AI synthesis</span>
              <span>GPT-4o World Knowledge</span>
            </div>
          </div>
        )}
      </div>

      {/* Source Inspector Drawer Modal */}
      <SourceInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => {
          setIsInspectorOpen(false);
          setSelectedCitation(null);
        }}
        chunks={retrievedChunks}
        highlightCitation={selectedCitation}
      />
    </div>
  );
};
