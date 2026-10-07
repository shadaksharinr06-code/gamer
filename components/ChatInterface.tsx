import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Trash2,
  Key,
  Bot,
  User,
  Sparkles,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage, DocumentMetadata, DualRAGResponse } from '@/lib/types';
import { DualResponseCard } from './DualResponseCard';

interface ChatInterfaceProps {
  document: DocumentMetadata | null;
  onResetSession: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  document,
  onResetSession,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'local'>('local');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load API key & provider from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('llm_api_key') || localStorage.getItem('openai_api_key');
    const savedProvider = (localStorage.getItem('llm_provider') as any) || 'local';
    if (savedKey) {
      setApiKey(savedKey);
      setProvider(savedProvider !== 'local' ? savedProvider : savedKey.startsWith('AIza') ? 'gemini' : 'openai');
    }
  }, []);

  const saveSettings = (newKey: string, newProvider: 'openai' | 'gemini' | 'local') => {
    setApiKey(newKey);
    setProvider(newProvider);
    localStorage.setItem('llm_api_key', newKey);
    localStorage.setItem('llm_provider', newProvider);
    setShowKeyModal(false);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    if (!document) {
      alert('Please upload a document first before querying.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          sessionId: document.id,
          apiKey: apiKey || undefined,
          provider: provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process query.');
      }

      const assistantMessage: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: '',
        response: data.response as DualRAGResponse,
        retrievedChunks: data.retrievedChunks,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to fetch response.'}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const suggestedQueries = [
    'What is the core objective or summary of this document?',
    'What key methodologies, requirements, or guidelines are described?',
    'Are there any notable risks, limitations, or future steps mentioned?',
  ];

  const getEngineBadgeLabel = () => {
    if (apiKey && provider === 'openai') return 'OpenAI GPT-4o';
    if (apiKey && provider === 'gemini') return 'Google Gemini 1.5';
    return 'Hybrid BM25 Extractive QA';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            RAG
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Dual-Response Q&A Console</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>{document ? `Active: ${document.name}` : 'Awaiting document upload'}</span>
              <span>•</span>
              <span className="text-blue-600 font-medium flex items-center gap-1">
                <Cpu className="w-3 h-3" /> {getEngineBadgeLabel()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* API Key Modal Trigger */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              apiKey
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
            title="Configure LLM Provider & API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? 'LLM Connected' : 'LLM Settings / Keys'}</span>
          </button>

          {/* Reset Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Ask Anything About Your Document
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Every query generates two strictly separated outputs: a 100% grounded document answer with exact page citations, plus broader supplemental world intelligence.
            </p>

            {document && (
              <div className="w-full space-y-2 text-left">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Suggested Questions
                </span>
                {suggestedQueries.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(sq)}
                    className="w-full text-left text-xs p-3 rounded-xl bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-between group shadow-2xs"
                  >
                    <span>{sq}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {msg.role === 'user' ? (
                /* User Message Bubble */
                <div className="flex items-start justify-end gap-2.5">
                  <div className="max-w-[85%] bg-slate-900 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs">
                    <p className="text-xs sm:text-sm font-normal leading-relaxed">{msg.content}</p>
                    <span className="block text-[10px] text-slate-400 text-right mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              ) : msg.isError ? (
                /* Error bubble */
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
                  {msg.content}
                </div>
              ) : msg.response ? (
                /* Assistant Dual Card */
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs mt-1 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DualResponseCard
                      response={msg.response}
                      retrievedChunks={msg.retrievedChunks}
                    />
                    <span className="block text-[10px] text-slate-400 mt-1 pl-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="w-full max-w-xl bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Synthesizing dual responses...
                </p>
                <p className="text-[11px] text-slate-500">
                  Retrieving chunks with hybrid BM25 + generating grounded citations
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Query Input Bar */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              document
                ? 'Ask any question about your document...'
                : 'Upload a document above to begin asking questions...'
            }
            disabled={!document || isLoading}
            rows={2}
            className="w-full resize-none bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none p-1.5 disabled:opacity-50"
          />

          <button
            onClick={() => handleSendQuery()}
            disabled={!inputQuery.trim() || !document || isLoading}
            className="p-2.5 rounded-xl bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shrink-0 shadow-xs"
            title="Send Question"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
          <span>Press Enter to send, Shift + Enter for new line</span>
          <span>Zero hallucination direct mode active</span>
        </div>
      </div>

      {/* LLM Provider & Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Select LLM Engine & API Key
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Choose your preferred AI provider for generating structured responses. You can use Google Gemini, OpenAI, or the built-in offline hybrid QA.
            </p>

            {/* Provider Switcher */}
            <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                  provider === 'gemini'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                  provider === 'openai'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OpenAI
              </button>
              <button
                type="button"
                onClick={() => {
                  setProvider('local');
                  setApiKey('');
                }}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                  provider === 'local'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Built-in (No Key)
              </button>
            </div>

            {provider !== 'local' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                </label>
                <input
                  type="password"
                  placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Stored locally in your browser session.
                </span>
              </div>
            )}

            {provider === 'local' && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 mb-4 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <span>
                  Using <strong>Hybrid BM25 + Extractive Synthesizer</strong>. It matches exact terminology, facts, and sentences from the document without needing any external API calls.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveSettings(apiKey, provider)}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
