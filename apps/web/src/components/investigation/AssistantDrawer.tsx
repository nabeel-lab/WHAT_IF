'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { X, Send, User, Bot, AlertCircle, Info, Beaker, FileText, CheckCircle2, Shield } from 'lucide-react';
import type { InvestigationGraph } from '@/types/investigation-graph';

const GLASS_SURFACE = '#151C25';
const RAISED_GLASS = '#1C2632';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';
const CRYPTO_TEAL = '#60F1D0';
const USER_BLUE = '#75B7FF';

interface AssistantDrawerProps {
  isOpen?: boolean;
  graph?: InvestigationGraph;
  cryptoPathId?: string;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  initialQuestion?: string;
  scanId?: string;
  projectId?: string;
  onClose: () => void;
}

type MessageRole = 'user' | 'assistant';

interface EvidenceItem {
  source_type: string;
  reference: string;
  claim: string;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  evidence?: EvidenceItem[];
  unknowns?: string[];
  related_actions?: string[];
}

export default function AssistantDrawer({
  isOpen = true,
  graph,
  cryptoPathId,
  entityType,
  entityId,
  entityTitle,
  initialQuestion,
  scanId: propScanId,
  projectId: propProjectId,
  onClose
}: AssistantDrawerProps) {
  if (isOpen === false) return null;
  const params = useParams();
  const projectId = (params?.projectId as string) || propProjectId || 'c371021a-8016-417b-90a0-eed042134927';
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello. I am the ECDAT Assistant. I explain verified evidence, runtime behavior, and recommendations grounded strictly in ECDAT discovery.`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('TECHNICAL');
  const initialSentRef = useRef(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine scan ID
  let activeScanId = propScanId || '059bfc23-cf81-4e62-a336-b4ee9e7e34e0';
  if (graph) {
    const firstPathNode = Array.from(graph.nodeIndex.values()).find(n => n.data.category === 'CRYPTO_ASSET');
    if (firstPathNode && 'cryptoAsset' in firstPathNode.data) {
      const cryptoData = firstPathNode.data as any;
      if (cryptoData.cryptoAsset?.scanId) {
        activeScanId = cryptoData.cryptoAsset.scanId;
      }
    }
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial Question Auto-Send
  useEffect(() => {
    if (initialQuestion && !initialSentRef.current) {
      initialSentRef.current = true;
      sendQuestion(initialQuestion);
    }
  }, [initialQuestion]);

  const sendQuestion = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const endpoint = `${apiBase}/projects/${projectId}/assistant`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: activeScanId,
          crypto_path_id: cryptoPathId,
          entity_type: entityType,
          entity_id: entityId,
          question: queryText,
          mode: mode,
          history: history,
        })
      });

      if (!res.ok) {
        throw new Error('Failed to reach assistant');
      }

      const data = await res.json();
      
      let formattedAnswer = data.answer || 'I could not generate an answer.';
      if (typeof formattedAnswer === 'string' && formattedAnswer.trim().startsWith('{') && formattedAnswer.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(formattedAnswer);
          if (parsed && typeof parsed === 'object') {
            formattedAnswer = Object.entries(parsed)
              .map(([k, v]) => `**${k.replace(/_/g, ' ').toUpperCase()}**: ${v ? (typeof v === 'object' ? JSON.stringify(v) : v) : 'None declared'}`)
              .join('\n\n');
          }
        } catch (_) {}
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formattedAnswer,
        evidence: data.evidence,
        unknowns: data.unknowns,
        related_actions: data.related_actions,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message}`,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendQuestion(input);

  const renderProvenanceBadge = (sourceType: string) => {
    switch (sourceType) {
      case 'ECDAT_EVIDENCE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ECDAT VERIFIED
          </span>
        );
      case 'SOURCE_CODE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold">
            <Beaker className="w-3 h-3 text-purple-300" />
            SOURCE CODE
          </span>
        );
      case 'ENTERPRISE_DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
            <FileText className="w-3 h-3 text-blue-300" />
            ENTERPRISE DOCUMENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-400 font-semibold">
            <Info className="w-3 h-3 text-slate-400" />
            UNKNOWN
          </span>
        );
    }
  };

  return (
    <div
      className="fixed right-0 top-14 bottom-0 z-50 w-[460px] max-w-[calc(100vw-280px)] liquid-glass border-l border-white/15 shadow-[-25px_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
      style={{ borderRadius: 0 }}
    >
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-20 p-4 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-[#EAF0F6]">
            <Bot className="w-4 h-4 text-[#60F1D0]" />
            Ask ECDAT — Grounded Assistant
          </h2>
          <div className="text-[11px] font-mono mt-1 text-[#A8B4C2] flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#60F1D0]/15 border border-[#60F1D0]/30 text-[#60F1D0] font-semibold">
              {entityType || (cryptoPathId ? 'CRYPTO_PATH' : 'CONTEXT')}
            </span>
            <span className="truncate max-w-[240px]">
              {entityTitle || cryptoPathId || 'Investigation Context'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={mode} 
            onChange={e => setMode(e.target.value)}
            className="bg-[#141E2B]/80 border border-white/15 rounded-lg text-[11px] font-mono text-[#EAF0F6] px-2 py-1 outline-none"
          >
            <option value="TECHNICAL">Technical</option>
            <option value="EXECUTIVE">Executive</option>
            <option value="EXPLAIN">Explain</option>
            <option value="EVIDENCE">Evidence Focus</option>
          </select>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-[#A8B4C2] hover:text-white border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
              msg.role === 'user' ? 'bg-[#75B7FF]/20 text-[#75B7FF] border border-[#75B7FF]/40' : 'bg-[#60F1D0]/20 text-[#60F1D0] border border-[#60F1D0]/40'
            }`}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-md border ${
                  msg.role === 'user'
                    ? 'bg-[#75B7FF]/15 border-[#75B7FF]/35 text-[#EAF0F6] rounded-tr-sm'
                    : 'liquid-glass-card border-white/15 text-[#EAF0F6] rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>

              {/* Provenance & Evidence Details */}
              {msg.role === 'assistant' && (
                <div className="mt-3 space-y-2.5 w-full">
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="text-xs space-y-1.5 liquid-glass-card p-3 rounded-xl border border-white/10">
                      <div className="font-mono text-[10px] text-[#A8B4C2] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-[#60F1D0]" /> Grounded Evidence Provenance
                      </div>
                      {msg.evidence.map((ev, i) => (
                        <div key={i} className="flex flex-col gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-2 text-[11px]">
                          <div className="flex items-center justify-between">
                            {renderProvenanceBadge(ev.source_type)}
                            <span className="font-mono text-[10px] text-[#A8B4C2]">{ev.reference}</span>
                          </div>
                          <div className="text-[#EAF0F6] mt-0.5 leading-normal font-mono">{ev.claim}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.unknowns && msg.unknowns.length > 0 && (
                    <div className="text-xs p-3 rounded-xl bg-[#FF7A90]/10 border border-[#FF7A90]/30 text-[#FF7A90] space-y-1">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> UNKNOWN / UNOBSERVED CONTEXT
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90 pl-1 font-mono">
                        {msg.unknowns.map((u, i) => <li key={i}>{u}</li>)}
                      </ul>
                    </div>
                  )}

                  {msg.related_actions && msg.related_actions.length > 0 && (
                    <div className="text-xs space-y-1.5">
                      <div className="font-mono text-[10px] text-[#8B7CFF] uppercase font-bold tracking-wider flex items-center gap-1">
                        <Beaker className="w-3 h-3" /> Grounded Action Candidates
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.related_actions.map((act, i) => (
                          <span key={i} className="bg-[#8B7CFF]/15 border border-[#8B7CFF]/35 text-[#8B7CFF] font-mono text-[10px] px-2.5 py-1 rounded-lg hover:border-[#8B7CFF] transition-colors cursor-pointer">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 flex-row items-center text-xs text-[#A8B4C2]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#60F1D0]/20 text-[#60F1D0] border border-[#60F1D0]/40">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl liquid-glass-card border border-white/10 font-mono text-[11px] text-[#60F1D0]">
              Assembling grounded context & evidence graph…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 relative"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about evidence, reachability, or recommendations..."
            disabled={loading}
            className="w-full bg-[#0B121C]/80 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#60F1D0]/50 transition-colors"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-1.5 bg-[#60F1D0] hover:bg-[#60F1D0]/90 disabled:bg-slate-700 disabled:text-slate-500 text-black rounded-lg transition-colors font-bold shadow-[0_0_12px_#60F1D040]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

