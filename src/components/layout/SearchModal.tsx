"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export interface FarmerSearchHit {
  id: string;
  name: string;
  details: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Farmers matching the text; it talks to the backend, so the layout passes it in. */
  searchFarmers?: (searchText: string) => Promise<FarmerSearchHit[]>;
}

const FARMER_SEARCH_DEBOUNCE_MS = 300;

const MOCK_AGENTS = [
  { id: '1', name: 'Almaz Regassa', details: 'Development Agent, Lume woreda' },
  { id: '2', name: 'Tadesse Alemu', details: 'Development Agent, Bako Tibe' },
];

const MOCK_KEBELES = [
  { id: '1', name: 'Almaz Sefer', details: 'Dendi woreda, Oromia' },
  { id: '2', name: 'Bako Tibe', details: 'Bako Tibe woreda, Oromia' },
  { id: '3', name: 'Gedo', details: 'Cheliya woreda, Oromia' },
];

const RECENT_SEARCHES = [
  'Bako Tibe',
  'Payments overdue'
];

export function SearchModal({ isOpen, onClose, searchFarmers }: SearchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [farmerHits, setFarmerHits] = useState<FarmerSearchHit[]>([]);
  const router = useRouter();

  // Farmers in the caller's scope, one request per pause in typing; a failed search just shows none.
  useEffect(() => {
    const searchText = query.trim();
    if (!searchText || !searchFarmers) return;
    let current = true;
    const timer = setTimeout(() => {
      searchFarmers(searchText)
        .then((hits) => current && setFarmerHits(hits))
        .catch(() => current && setFarmerHits([]));
    }, FARMER_SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, searchFarmers]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clear query when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setQuery(""), 200); // Clear after fade out
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();
  
  const filteredFarmers = normalizedQuery ? farmerHits : [];
    
  const filteredAgents = normalizedQuery 
    ? MOCK_AGENTS.filter(a => a.name.toLowerCase().includes(normalizedQuery) || a.details.toLowerCase().includes(normalizedQuery))
    : [];

  const filteredKebeles = normalizedQuery 
    ? MOCK_KEBELES.filter(k => k.name.toLowerCase().includes(normalizedQuery) || k.details.toLowerCase().includes(normalizedQuery))
    : [];

  const hasResults = filteredFarmers.length > 0 || filteredAgents.length > 0 || filteredKebeles.length > 0;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[10vh] sm:px-4 sm:pt-[12vh] bg-ink/30 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[650px] bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Search Input */}
        <div className="flex items-center px-4 border-b border-line-soft">
          <svg className="w-5 h-5 text-brand-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            autoFocus 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search farmers, agents, kebeles..." 
            className="min-w-0 flex-1 py-4 px-3 text-[16px] text-ink outline-none placeholder:text-subtle font-medium"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 mr-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="text-[12px] text-muted flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline">Close with</span>
            <kbd className="px-1.5 py-0.5 border border-zinc-200 rounded text-[11px] font-bold text-ink-soft bg-zinc-50 shadow-sm">ESC</kbd>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="max-h-[60vh] min-h-[150px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
          
          {!normalizedQuery && (
            <div className="mb-2 mt-2">
              <div className="px-3 py-2 text-[11px] font-bold text-muted tracking-wider uppercase">Recent Searches</div>
              <div className="flex items-center gap-2.5 px-3 pb-2 flex-wrap mt-1">
                {RECENT_SEARCHES.map((search) => (
                  <button 
                    key={search}
                    onClick={() => setQuery(search)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white text-[12.5px] font-medium text-ink-soft transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {normalizedQuery && !hasResults && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-ink">No results found</p>
              <p className="text-[13px] text-muted mt-1">We couldn&apos;t find anything matching &quot;{query}&quot;</p>
            </div>
          )}

          {normalizedQuery && hasResults && (
            <>
              {/* FARMERS */}
              {filteredFarmers.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-2 text-[11px] font-bold text-muted tracking-wider uppercase">Farmers</div>
                  {filteredFarmers.map((farmer) => (
                    <div key={farmer.id} onClick={() => { onClose(); router.push(`/farmers/${farmer.id}`); }} className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-muted group-hover:bg-brand-green/10 group-hover:text-brand-green transition-colors flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-ink-soft group-hover:text-ink transition-colors">{farmer.name}</p>
                          <p className="text-[12px] text-muted mt-0.5">{farmer.details}</p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[12px] text-brand-green font-medium transition-opacity">
                        Select 
                        <kbd className="px-1.5 py-0.5 border border-brand-green/20 rounded text-[10px] font-bold bg-white shadow-sm">Enter</kbd>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AGENTS */}
              {filteredAgents.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-2 text-[11px] font-bold text-muted tracking-wider uppercase">Agents</div>
                  {filteredAgents.map(agent => (
                    <div key={agent.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-muted group-hover:bg-brand-green/10 group-hover:text-brand-green transition-colors flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-ink-soft group-hover:text-ink transition-colors">{agent.name}</p>
                          <p className="text-[12px] text-muted mt-0.5">{agent.details}</p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[12px] text-brand-green font-medium transition-opacity">
                        Select 
                        <kbd className="px-1.5 py-0.5 border border-brand-green/20 rounded text-[10px] font-bold bg-white shadow-sm">Enter</kbd>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* KEBELES */}
              {filteredKebeles.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-2 text-[11px] font-bold text-muted tracking-wider uppercase">Kebeles</div>
                  {filteredKebeles.map(kebele => (
                    <div key={kebele.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-muted group-hover:bg-brand-green/10 group-hover:text-brand-green transition-colors flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-ink-soft group-hover:text-ink transition-colors">{kebele.name}</p>
                          <p className="text-[12px] text-muted mt-0.5">{kebele.details}</p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[12px] text-brand-green font-medium transition-opacity">
                        Select 
                        <kbd className="px-1.5 py-0.5 border border-brand-green/20 rounded text-[10px] font-bold bg-white shadow-sm">Enter</kbd>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface border-t border-line-soft">
          <div className="text-[12px] text-muted font-medium flex items-center">
            Press <kbd className="px-1.5 py-0.5 mx-1 border border-zinc-200 rounded text-[10px] font-bold text-ink-soft bg-white shadow-sm">Cmd+K</kbd> to search anytime
          </div>
          <div className="flex items-center gap-4 text-[12px] text-muted font-medium hidden sm:flex">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <kbd className="px-1.5 py-0.5 border border-zinc-200 rounded text-[10px] font-bold text-ink-soft bg-white shadow-sm">↑</kbd>
                <kbd className="px-1.5 py-0.5 border border-zinc-200 rounded text-[10px] font-bold text-ink-soft bg-white shadow-sm">↓</kbd>
              </div>
              Navigate
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 border border-zinc-200 rounded text-[10px] font-bold text-ink-soft bg-white shadow-sm">↵</kbd>
              Select
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
