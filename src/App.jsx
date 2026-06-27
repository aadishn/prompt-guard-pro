import React, { useState, useEffect, useMemo } from "react";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import {
  Shield, Copy, Plus, Trash2, EyeOff, Lock, Sparkles, Zap, X, 
  Terminal, RotateCcw, Check, Loader2, Undo2, RotateCw
} from "lucide-react";
import { redactText } from "./utils/redactor";

export default function App() {
  // --- 1. CORE STATE ---
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);

  // --- 2. PERSISTENT STATE (LocalStorage) ---
  const [customRules, setCustomRules] = useState(() => {
    try {
      const saved = localStorage.getItem("pg_rules");
      return saved ? JSON.parse(saved) : [{ word: "", placeholder: "PROJECT_X" }];
    } catch {
      return [{ word: "", placeholder: "PROJECT_X" }];
    }
  });

  // --- 3. RESTORATION STATE (Step 2) ---
  const [currentMap, setCurrentMap] = useState({}); 
  const [aiResponse, setAiResponse] = useState(""); 
  const [restoredText, setRestoredText] = useState("");

  // --- 4. EFFECTS ---
  useEffect(() => {
    localStorage.setItem("pg_rules", JSON.stringify(customRules));
  }, [customRules]);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setCurrentMap({});
      setRestoredText("");
      setAiResponse("");
    }
  }, [input]);

  // --- 5. NLP ENGINE INIT ---
  const nlp = useMemo(() => {
    try {
      const instance = winkNLP(model);
      setIsModelReady(true);
      return instance;
    } catch (e) {
      console.error("Wink-NLP failed to init", e);
      return null;
    }
  }, []);

  const its = nlp?.its;

  // --- 6. HANDLERS ---
  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setCurrentMap({});
  };

  const performSanitization = (useIntelligence) => {
    if (!input.trim()) return;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        let entities = [];

        if (useIntelligence && nlp) {
          const doc = nlp.readDoc(input);
          // Catching Persons, Organizations, and Locations
          entities = doc.entities().out(its.detail).map((ent) => ({
            text: ent.value,
            label: ent.type,
          }));
        }

        const result = redactText(input, entities, customRules);
        
        if (result && result.redactedText !== undefined) {
          setOutput(result.redactedText);
          setCurrentMap(result.sessionMap || {});
        }
      } catch (err) {
        console.error("Sanitization failed:", err);
      } finally {
        setIsProcessing(false);
      }
    }, 500);
  };

  const handleRestore = () => {
    if (!aiResponse) return;
    let temp = aiResponse;
    Object.entries(currentMap).forEach(([placeholder, original]) => {
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "g");
      temp = temp.replace(regex, original);
    });
    setRestoredText(temp);
  };

  const isInputEmpty = !input.trim();

  return (
    <div className="min-h-screen text-slate-200 p-4 md:p-12 font-sans selection:bg-indigo-500/40">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8">
          <div className="flex items-center gap-5">
            <div className="relative bg-slate-900 p-4 rounded-2xl border border-indigo-500/50 shadow-2xl glow-indigo">
              <Shield className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                PROMPTGUARD <span className="text-indigo-500 not-italic font-light">PRO</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className={`w-2 h-2 rounded-full ${isModelReady ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" : "bg-amber-500 animate-pulse"}`} />
                <span className="text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase">
                  {isModelReady ? "Status: Zero-Trust Local Engine Active" : "Status: Initializing AI Engine..."}
                </span>
              </div>
            </div>
          </div>

          <button onClick={() => setShowAudit(true)} className="flex items-center gap-3 text-[10px] font-bold bg-slate-900/50 hover:bg-slate-800 px-6 py-3 rounded-xl border border-slate-800 transition-all uppercase tracking-widest text-slate-400">
            <Lock size={14} className="text-indigo-500" /> Verify Security
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Sidebar: Rules */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl relative">
              <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8 px-2">
                <EyeOff size={14} /> Shield Protocol
              </h2>

              <div className="space-y-6">
                {customRules.map((rule, idx) => (
                  <div key={idx} className="group p-6 bg-slate-950/50 rounded-3xl border border-slate-800 transition-all hover:border-indigo-500/30">
                    <div className="flex justify-between mb-4">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Protocol Mapping</label>
                      <button onClick={() => setCustomRules(customRules.filter((_, i) => i !== idx))} className="text-slate-700 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <input
                        className="w-full bg-transparent border-b border-slate-800 focus:border-indigo-500 text-sm outline-none text-white py-2 transition-all placeholder:text-slate-800"
                        placeholder="Secret Word..."
                        value={rule.word}
                        onChange={(e) => {
                          const n = [...customRules]; n[idx].word = e.target.value; setCustomRules(n);
                        }}
                      />
                      <div className="flex items-center gap-2 font-mono text-xs text-indigo-400 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                        <span>[</span>
                        <input
                          className="flex-1 bg-transparent border-none outline-none uppercase placeholder:text-indigo-900"
                          placeholder="TAG"
                          value={rule.placeholder.replace(/[\[\]]/g, "")}
                          onChange={(e) => {
                            const n = [...customRules];
                            n[idx].placeholder = e.target.value.toUpperCase().replace(/\s+/g, "_");
                            setCustomRules(n);
                          }}
                        />
                        <span>]</span>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setCustomRules([...customRules, { word: "", placeholder: "SECRET" }])}
                  className="w-full py-4 border border-dashed border-slate-800 rounded-3xl text-[10px] font-black text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all uppercase tracking-widest bg-slate-900/20"
                >
                  + Add Protocol Rule
                </button>
              </div>
            </div>
          </div>

          {/* Right Section: Main Workspace */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* 1. Sanitization Box */}
            <div className="space-y-6">
              <div className="relative bg-slate-900/50 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
                {isProcessing && <div className="scanning-line" />}
                
                {!isInputEmpty && (
                  <button onClick={handleClear} className="absolute top-8 right-8 z-20 p-2 bg-slate-800/50 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-full transition-all">
                    <RotateCcw size={18} />
                  </button>
                )}

                <textarea
                  className="w-full h-80 bg-slate-950/30 rounded-[3rem] p-10 focus:ring-1 focus:ring-indigo-500/30 border-none outline-none text-xl transition-all resize-none text-slate-200 font-light leading-relaxed placeholder:text-slate-800"
                  placeholder="PASTE YOUR RAW PROMPT FOR ANALYSIS..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />

                <div className="absolute bottom-8 right-8 flex gap-4">
                  <button onClick={() => performSanitization(false)} disabled={isInputEmpty || isProcessing} 
                    className="px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all disabled:opacity-30 bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 border border-slate-700 shadow-xl">
                    <Zap size={14} /> Basic
                  </button>
                  <button onClick={() => performSanitization(true)} disabled={isInputEmpty || isProcessing || !isModelReady}
                    className="px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all disabled:opacity-30 bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-2xl shadow-indigo-900/40">
                    {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} 
                    Intelligence
                  </button>
                </div>
              </div>

              {output && (
                <div className="animate-in fade-in slide-in-from-top-10 duration-700 bg-slate-900/80 border-2 border-emerald-500/10 rounded-[3rem] p-10 relative group glow-emerald shadow-2xl">
                  <div className="flex justify-between items-center mb-6 px-4">
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.4em] flex items-center gap-4">
                      <Terminal size={14} /> Analysis Complete
                    </span>
                    <button onClick={handleCopy} className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${copied ? "text-emerald-400 scale-105" : "text-slate-500 hover:text-white"}`}>
                      {copied ? <Check size={14} /> : <Copy size={14} />} 
                      {copied ? "Copied to Clipboard!" : "Copy Clean Prompt"}
                    </button>
                  </div>
                  <div className="font-mono text-emerald-400 text-lg leading-relaxed whitespace-pre-wrap">{output}</div>
                </div>
              )}
            </div>

            {/* 2. Restoration Box (Step 2) */}
            {output && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 bg-slate-900/20 border border-slate-800 p-10 rounded-[3.5rem] space-y-6 backdrop-blur-sm">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] flex items-center gap-3">
                  <Undo2 size={16} /> Context Restoration Protocol
                </h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed">
                  Paste the AI's response below. The system will automatically detect the placeholders (like [PERSON_1]) and swap them back for your original data.
                </p>
                <textarea
                  className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-3xl p-8 text-sm outline-none focus:border-indigo-500 transition-all text-slate-300 font-light resize-none leading-relaxed"
                  placeholder="Paste AI response here..."
                  value={aiResponse}
                  onChange={(e) => setAiResponse(e.target.value)}
                />
                <button onClick={handleRestore} disabled={!aiResponse} 
                  className="w-full py-5 bg-slate-800 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                  <RotateCw size={16} /> Restore Original Data
                </button>
                
                {restoredText && (
                  <div className="mt-6 p-10 bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] font-sans text-slate-200 leading-relaxed text-md animate-in zoom-in-95 shadow-inner">
                    {restoredText}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Audit Modal */}
        {showAudit && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-slate-800 max-w-xl w-full rounded-[3rem] p-12 relative overflow-hidden text-center shadow-3xl">
              <button onClick={() => setShowAudit(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              <h3 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter">Zero-Trust Audit</h3>
              <p className="text-slate-400 mb-10 text-sm font-light leading-relaxed">
                PromptGuard Pro is built on a local-first architecture. We do not use servers, APIs, or databases to process your prompts. Every character is analyzed within your browser's isolated memory space.
              </p>
              <button onClick={() => setShowAudit(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white shadow-xl">
                End Audit Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}