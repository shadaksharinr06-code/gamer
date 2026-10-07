import React from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { DocumentChunk } from '@/lib/types';

interface SourceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chunks: DocumentChunk[];
  highlightCitation?: string | null;
}

export const SourceInspectorModal: React.FC<SourceInspectorModalProps> = ({
  isOpen,
  onClose,
  chunks,
  highlightCitation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Retrieved Source Chunks</h3>
              <p className="text-xs text-slate-500">
                Grounding context supplied to the LLM (k={chunks.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chunks List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {chunks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No source chunks retrieved.</p>
          ) : (
            chunks.map((chunk, idx) => {
              const citationLabel = `Page ${chunk.pageNumber}, ${chunk.sectionOrPara}`;
              const isHighlighted = highlightCitation && citationLabel.includes(highlightCitation);

              return (
                <div
                  key={chunk.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isHighlighted
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                        Chunk #{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        Page {chunk.pageNumber} • {chunk.sectionOrPara}
                      </span>
                      {isHighlighted && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Matched Citation
                        </span>
                      )}
                    </div>
                    {chunk.score !== undefined && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Score: {(chunk.score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap text-xs bg-white p-3 rounded-lg border border-slate-100">
                    {chunk.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
