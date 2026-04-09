'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import * as XLSX from 'xlsx';

interface TradingModel {
  id: string;
  name: string;
  description: string | null;
  risk_management: string | null;
  stop_loss_targets: string | null;
  created_at: string;
}

interface JournalEntry {
  id: string;
  asset: string;
  direction: 'long' | 'short';
  timeframe: string;
  trading_model_id: string | null;
  trade_time: string | null;
  risk_reward: string;
  result: string;
  note: string;
  trading_models?: TradingModel | null;
}

interface FilterState {
  asset: string;
  direction: string;
  timeframe: string;
  trading_model: string;
  trade_time: string;
  risk_reward: string;
  result: string;
  note: string;
}

const DIRECTIONS = ['long', 'short'];
const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '3d', '1w', '1M'];

const emptyEntry = (): Omit<JournalEntry, 'id' | 'trading_models'> => ({
  asset: '',
  direction: 'long',
  timeframe: '',
  trading_model_id: null,
  trade_time: null,
  risk_reward: '',
  result: '',
  note: '',
});

export default function JournalPage() {
  const { user, loading } = useAuth();
  const supabase = createClient();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [models, setModels] = useState<TradingModel[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    asset: '', direction: '', timeframe: '', trading_model: '',
    trade_time: '', risk_reward: '', result: '', note: '',
  });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Model modal state
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', description: '', risk_management: '', stop_loss_targets: '' });
  const [savingModel, setSavingModel] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // New row
  const [newRow, setNewRow] = useState<Omit<JournalEntry, 'id' | 'trading_models'>>(emptyEntry());
  const [addingRow, setAddingRow] = useState(false);

  // Clear confirm
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setActiveFilter(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [{ data: entriesData }, { data: modelsData }] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*, trading_models(id, name, description, risk_management, stop_loss_targets, created_at)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trading_models')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setEntries((entriesData as JournalEntry[]) || []);
      setModels((modelsData as TradingModel[]) || []);
    } catch (err) {
      console.error('Failed to fetch journal data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
    else setLoadingData(false);
  }, [user, fetchData]);

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    const modelName = e.trading_models?.name || '';
    const timeStr = e.trade_time ? new Date(e.trade_time).toLocaleString('ru-RU') : '';
    return (
      (!filters.asset || e.asset.toLowerCase().includes(filters.asset.toLowerCase())) &&
      (!filters.direction || e.direction === filters.direction) &&
      (!filters.timeframe || e.timeframe.toLowerCase().includes(filters.timeframe.toLowerCase())) &&
      (!filters.trading_model || modelName.toLowerCase().includes(filters.trading_model.toLowerCase())) &&
      (!filters.trade_time || timeStr.includes(filters.trade_time)) &&
      (!filters.risk_reward || e.risk_reward.toLowerCase().includes(filters.risk_reward.toLowerCase())) &&
      (!filters.result || e.result.toLowerCase().includes(filters.result.toLowerCase())) &&
      (!filters.note || e.note.toLowerCase().includes(filters.note.toLowerCase()))
    );
  });

  // Add trading model
  const handleSaveModel = async () => {
    if (!user || !modelForm.name.trim()) return;
    setSavingModel(true);
    try {
      const { data, error } = await supabase
        .from('trading_models')
        .insert({ user_id: user.id, name: modelForm.name.trim(), description: modelForm.description || null, risk_management: modelForm.risk_management || null, stop_loss_targets: modelForm.stop_loss_targets || null })
        .select()
        .single();
      if (!error && data) {
        setModels((prev) => [data as TradingModel, ...prev]);
        setModelForm({ name: '', description: '', risk_management: '', stop_loss_targets: '' });
        setShowModelModal(false);
      }
    } catch (err) {
      console.error('Failed to save model:', err);
    } finally {
      setSavingModel(false);
    }
  };

  // Add new entry row
  const handleAddRow = async () => {
    if (!user) return;
    setAddingRow(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({ user_id: user.id, ...newRow })
        .select('*, trading_models(id, name, description, risk_management, stop_loss_targets, created_at)')
        .single();
      if (!error && data) {
        setEntries((prev) => [data as JournalEntry, ...prev]);
        setNewRow(emptyEntry());
      }
    } catch (err) {
      console.error('Failed to add entry:', err);
    } finally {
      setAddingRow(false);
    }
  };

  // Inline cell edit save
  const handleCellSave = async (entry: JournalEntry, col: string) => {
    if (!user) return;
    const updateData: Record<string, any> = {};
    if (col === 'trading_model_id') {
      updateData.trading_model_id = editValue || null;
    } else {
      updateData[col] = editValue;
    }
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .update(updateData)
        .eq('id', entry.id)
        .select('*, trading_models(id, name, description, risk_management, stop_loss_targets, created_at)')
        .single();
      if (!error && data) {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? (data as JournalEntry) : e)));
      }
    } catch (err) {
      console.error('Failed to update entry:', err);
    }
    setEditingCell(null);
  };

  // Delete entry
  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('journal_entries').delete().eq('id', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  // Clear all entries
  const handleClearTable = async () => {
    if (!user) return;
    try {
      await supabase.from('journal_entries').delete().eq('user_id', user.id);
      setEntries([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear table:', err);
    }
  };

  // Export to XLSX
  const handleExport = () => {
    const rows = filteredEntries.map((e) => ({
      'Актив': e.asset,
      'Направление': e.direction,
      'Таймфрейм': e.timeframe,
      'Торговая модель': e.trading_models?.name || '',
      'Время': e.trade_time ? new Date(e.trade_time).toLocaleString('ru-RU') : '',
      'Риск-ревард': e.risk_reward,
      'Результат': e.result,
      'Заметка': e.note,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Журнал сделок');
    XLSX.writeFile(wb, 'journal.xlsx');
  };

  const startEdit = (rowId: string, col: string, value: string) => {
    setEditingCell({ rowId, col });
    setEditValue(value);
  };

  const columns = [
    { key: 'asset', label: 'Актив' },
    { key: 'direction', label: 'Направление' },
    { key: 'timeframe', label: 'Таймфрейм' },
    { key: 'trading_model_id', label: 'Торговая модель' },
    { key: 'trade_time', label: 'Время' },
    { key: 'risk_reward', label: 'Риск-ревард' },
    { key: 'result', label: 'Результат' },
    { key: 'note', label: 'Заметка' },
  ];

  // --- Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-white/60 text-sm leading-relaxed font-light tracking-wide">
              Эта страница предназначена для ведения журнала сделок. Пожалуйста войдите в аккаунт
            </p>
            <a href="/login" className="inline-block mt-6 text-[11px] font-bold uppercase tracking-[0.2em] bg-white text-black px-8 py-3 hover:bg-amber-400 transition-all duration-300">
              Войти
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30 mb-2">Трейдинг</p>
            <h1 className="text-2xl md:text-3xl font-display font-light text-white tracking-tight">Журнал сделок</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowModelModal(true)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-amber-400/40 text-amber-400 px-4 py-2.5 hover:border-amber-400 hover:bg-amber-400/5 transition-all duration-300"
            >
              + Добавить торговую модель
            </button>
            <button
              onClick={handleExport}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 text-white/70 px-4 py-2.5 hover:border-white/50 hover:text-white transition-all duration-300"
            >
              Экспорт XLSX
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-red-500/30 text-red-400/70 px-4 py-2.5 hover:border-red-500/60 hover:text-red-400 transition-all duration-300"
            >
              Очистить таблицу
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-white/10 overflow-x-auto">
          <table className="w-full text-xs text-white/70 border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-3 py-3 font-semibold uppercase tracking-[0.15em] text-white/40 text-[10px] whitespace-nowrap relative group">
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {/* Filter button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === col.key ? null : col.key); }}
                        className={`w-4 h-4 flex items-center justify-center transition-colors ${filters[col.key as keyof FilterState] ? 'text-amber-400' : 'text-white/20 hover:text-white/50'}`}
                        title="Фильтр"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M1.5 2h13l-5 6v5l-3-1.5V8L1.5 2z" />
                        </svg>
                      </button>
                    </div>
                    {/* Filter dropdown */}
                    {activeFilter === col.key && (
                      <div ref={filterRef} className="absolute top-full left-0 z-50 mt-1 bg-[#111] border border-white/20 shadow-xl p-2 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                        {col.key === 'direction' ? (
                          <select
                            value={filters.direction}
                            onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
                            className="w-full bg-[#1a1a1a] border border-white/10 text-white/70 text-xs px-2 py-1.5 outline-none"
                          >
                            <option value="">Все</option>
                            {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : col.key === 'trading_model_id' ? (
                          <select
                            value={filters.trading_model}
                            onChange={(e) => setFilters((f) => ({ ...f, trading_model: e.target.value }))}
                            className="w-full bg-[#1a1a1a] border border-white/10 text-white/70 text-xs px-2 py-1.5 outline-none"
                          >
                            <option value="">Все</option>
                            {models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                          </select>
                        ) : (
                          <input
                            autoFocus
                            type="text"
                            placeholder="Фильтр..."
                            value={filters[col.key as keyof FilterState]}
                            onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                            className="w-full bg-[#1a1a1a] border border-white/10 text-white/70 text-xs px-2 py-1.5 outline-none placeholder-white/20"
                          />
                        )}
                        {filters[col.key as keyof FilterState] && (
                          <button
                            onClick={() => setFilters((f) => ({ ...f, [col.key]: '' }))}
                            className="mt-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                          >
                            Сбросить
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {/* New row input */}
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="BTC/USDT"
                    value={newRow.asset}
                    onChange={(e) => setNewRow((r) => ({ ...r, asset: e.target.value }))}
                    className="w-full bg-transparent border-b border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none placeholder-white/20 focus:border-amber-400/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={newRow.direction}
                    onChange={(e) => setNewRow((r) => ({ ...r, direction: e.target.value as 'long' | 'short' }))}
                    className="w-full bg-[#111] border border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none"
                  >
                    {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={newRow.timeframe}
                    onChange={(e) => setNewRow((r) => ({ ...r, timeframe: e.target.value }))}
                    className="w-full bg-[#111] border border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none"
                  >
                    <option value="">—</option>
                    {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={newRow.trading_model_id || ''}
                    onChange={(e) => setNewRow((r) => ({ ...r, trading_model_id: e.target.value || null }))}
                    className="w-full bg-[#111] border border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none"
                  >
                    <option value="">—</option>
                    {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="datetime-local"
                    value={newRow.trade_time ? newRow.trade_time.slice(0, 16) : ''}
                    onChange={(e) => setNewRow((r) => ({ ...r, trade_time: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                    className="w-full bg-transparent border-b border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none focus:border-amber-400/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="1:2"
                    value={newRow.risk_reward}
                    onChange={(e) => setNewRow((r) => ({ ...r, risk_reward: e.target.value }))}
                    className="w-full bg-transparent border-b border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none placeholder-white/20 focus:border-amber-400/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="+2%"
                    value={newRow.result}
                    onChange={(e) => setNewRow((r) => ({ ...r, result: e.target.value }))}
                    className="w-full bg-transparent border-b border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none placeholder-white/20 focus:border-amber-400/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="Заметка..."
                    value={newRow.note}
                    onChange={(e) => setNewRow((r) => ({ ...r, note: e.target.value }))}
                    className="w-full bg-transparent border-b border-white/10 text-white/80 text-xs px-1 py-0.5 outline-none placeholder-white/20 focus:border-amber-400/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={handleAddRow}
                    disabled={addingRow || !newRow.asset.trim()}
                    className="text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 disabled:opacity-30 transition-colors whitespace-nowrap"
                  >
                    {addingRow ? '...' : '+ Добавить'}
                  </button>
                </td>
              </tr>

              {/* Data rows */}
              {loadingData ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-white/30 text-xs">Загрузка...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-white/20 text-xs tracking-widest uppercase">Нет записей</td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.015] transition-colors group">
                    {/* asset */}
                    <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(entry.id, 'asset', entry.asset)}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'asset' ? (
                        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'asset')} onKeyDown={(e) => { if (e.key === 'Enter') handleCellSave(entry, 'asset'); if (e.key === 'Escape') setEditingCell(null); }} className="w-full bg-transparent border-b border-amber-400/50 text-white text-xs px-1 py-0.5 outline-none" />
                      ) : (
                        <span className="text-white/80 font-medium">{entry.asset || <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* direction */}
                    <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(entry.id, 'direction', entry.direction)}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'direction' ? (
                        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'direction')} className="bg-[#111] border border-white/10 text-white text-xs px-1 py-0.5 outline-none">
                          {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs font-bold uppercase tracking-widest ${entry.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>{entry.direction}</span>
                      )}
                    </td>
                    {/* timeframe */}
                    <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(entry.id, 'timeframe', entry.timeframe)}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'timeframe' ? (
                        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'timeframe')} className="bg-[#111] border border-white/10 text-white text-xs px-1 py-0.5 outline-none">
                          <option value="">—</option>
                          {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <span className="text-white/60">{entry.timeframe || <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* trading model */}
                    <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(entry.id, 'trading_model_id', entry.trading_model_id || '')}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'trading_model_id' ? (
                        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'trading_model_id')} className="bg-[#111] border border-white/10 text-white text-xs px-1 py-0.5 outline-none">
                          <option value="">—</option>
                          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-amber-400/80 text-xs">{entry.trading_models?.name || <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* time */}
                    <td className="px-2 py-2 cursor-pointer whitespace-nowrap" onClick={() => startEdit(entry.id, 'trade_time', entry.trade_time ? entry.trade_time.slice(0, 16) : '')}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'trade_time' ? (
                        <input autoFocus type="datetime-local" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { const iso = editValue ? new Date(editValue).toISOString() : ''; setEditValue(iso); handleCellSave(entry, 'trade_time'); }} className="bg-transparent border-b border-amber-400/50 text-white text-xs px-1 py-0.5 outline-none" />
                      ) : (
                        <span className="text-white/50 text-[11px]">{entry.trade_time ? new Date(entry.trade_time).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* risk_reward */}
                    <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(entry.id, 'risk_reward', entry.risk_reward)}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'risk_reward' ? (
                        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'risk_reward')} onKeyDown={(e) => { if (e.key === 'Enter') handleCellSave(entry, 'risk_reward'); if (e.key === 'Escape') setEditingCell(null); }} className="w-full bg-transparent border-b border-amber-400/50 text-white text-xs px-1 py-0.5 outline-none" />
                      ) : (
                        <span className="text-white/60">{entry.risk_reward || <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* result */}
                    <td className="px-2 py-2 cursor-pointer" onClick={() => startEdit(entry.id, 'result', entry.result)}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'result' ? (
                        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'result')} onKeyDown={(e) => { if (e.key === 'Enter') handleCellSave(entry, 'result'); if (e.key === 'Escape') setEditingCell(null); }} className="w-full bg-transparent border-b border-amber-400/50 text-white text-xs px-1 py-0.5 outline-none" />
                      ) : (
                        <span className={`text-xs font-medium ${entry.result.startsWith('+') ? 'text-emerald-400' : entry.result.startsWith('-') ? 'text-red-400' : 'text-white/60'}`}>{entry.result || <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* note */}
                    <td className="px-2 py-2 cursor-pointer max-w-[200px]" onClick={() => startEdit(entry.id, 'note', entry.note)}>
                      {editingCell?.rowId === entry.id && editingCell.col === 'note' ? (
                        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(entry, 'note')} onKeyDown={(e) => { if (e.key === 'Enter') handleCellSave(entry, 'note'); if (e.key === 'Escape') setEditingCell(null); }} className="w-full bg-transparent border-b border-amber-400/50 text-white text-xs px-1 py-0.5 outline-none" />
                      ) : (
                        <span className="text-white/50 truncate block">{entry.note || <span className="text-white/20">—</span>}</span>
                      )}
                    </td>
                    {/* delete */}
                    <td className="px-2 py-2">
                      <button onClick={() => handleDeleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all duration-200 text-xs">✕</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stats */}
        {filteredEntries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-6 text-[11px] text-white/30 tracking-widest uppercase">
            <span>Всего: <span className="text-white/50">{filteredEntries.length}</span></span>
            <span>Long: <span className="text-emerald-400/60">{filteredEntries.filter((e) => e.direction === 'long').length}</span></span>
            <span>Short: <span className="text-red-400/60">{filteredEntries.filter((e) => e.direction === 'short').length}</span></span>
          </div>
        )}
      </main>

      <Footer />

      {/* Trading Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Добавить торговую модель</h2>
              <button onClick={() => setShowModelModal(false)} className="text-white/30 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1.5">Название модели *</label>
                <input
                  type="text"
                  placeholder="Например: AMD модель"
                  value={modelForm.name}
                  onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-amber-400/40 placeholder-white/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1.5">Описание модели</label>
                <textarea
                  rows={3}
                  placeholder="Опишите торговую модель..."
                  value={modelForm.description}
                  onChange={(e) => setModelForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-amber-400/40 placeholder-white/20 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1.5">Риск-менеджмент</label>
                <textarea
                  rows={2}
                  placeholder="Правила управления рисками..."
                  value={modelForm.risk_management}
                  onChange={(e) => setModelForm((f) => ({ ...f, risk_management: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-amber-400/40 placeholder-white/20 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1.5">Стоп-лосс и цели</label>
                <textarea
                  rows={2}
                  placeholder="Уровни стоп-лосса и тейк-профита..."
                  value={modelForm.stop_loss_targets}
                  onChange={(e) => setModelForm((f) => ({ ...f, stop_loss_targets: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-amber-400/40 placeholder-white/20 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowModelModal(false)} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors px-4 py-2">Отмена</button>
              <button
                onClick={handleSaveModel}
                disabled={savingModel || !modelForm.name.trim()}
                className="text-[10px] font-bold uppercase tracking-[0.2em] bg-amber-400 text-black px-6 py-2.5 hover:bg-amber-300 disabled:opacity-40 transition-all duration-300"
              >
                {savingModel ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-sm shadow-2xl p-6 text-center">
            <p className="text-white/70 text-sm mb-6">Вы уверены? Все записи журнала будут удалены безвозвратно.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 text-white/60 px-5 py-2.5 hover:border-white/40 hover:text-white transition-all duration-300">Отмена</button>
              <button onClick={handleClearTable} className="text-[10px] font-bold uppercase tracking-[0.2em] bg-red-500 text-white px-5 py-2.5 hover:bg-red-400 transition-all duration-300">Очистить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
