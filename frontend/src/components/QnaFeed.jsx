import React, { useState, useRef, useEffect } from 'react';
import { Search, Flame, Clock, HelpCircle, Plus, Sparkles, CheckCircle2, Keyboard, X } from 'lucide-react';
import QuestionCard from './QuestionCard';
import AskModal from './AskModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function QnaFeed({
  questions = [],
  counts = {},
  loading = false,
  userFingerprint,
  onUpvote,
  onAddAnswer,
  onCreateQuestion,
  sort,
  onSortChange,
  search,
  onSearchChange,
  isAdmin = false,
  onStatusChange,
  onDeleteQuestion
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const searchInputRef = useRef(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isInputActive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // 1. Shortcut Pencarian: "/" atau "Cmd/Ctrl + K"
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      const isSlash = e.key === '/' && !isInputActive;

      if (isCmdK || isSlash) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      // 2. Shortcut Escape pada input pencarian / modal
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (document.activeElement === searchInputRef.current) {
          e.preventDefault();
          if (search) {
            onSearchChange('');
          } else {
            searchInputRef.current.blur();
          }
        }
        return;
      }

      // Jangan proses pintasan navigasi jika sedang mengetik atau modal aktif
      if (isInputActive || isModalOpen || isShortcutsOpen) return;

      // 3. Tab Shortcuts: 1, 2, 3
      if (e.key === '1') {
        e.preventDefault();
        onSortChange('top');
      } else if (e.key === '2') {
        e.preventDefault();
        onSortChange('newest');
      } else if (e.key === '3') {
        e.preventDefault();
        onSortChange('unanswered');
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isShortcutsOpen, search, onSearchChange, onSortChange]);

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Cari pertanyaan atau topik... (Tekan / atau ${isMac ? '⌘K' : 'Ctrl+K'})`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-24 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
          <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
            {search ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  searchInputRef.current?.focus();
                }}
                title="Hapus kata kunci (Esc)"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 select-none pointer-events-none">
                <kbd className="px-1.5 py-0.5 bg-slate-200/70 border border-slate-300/80 rounded font-semibold text-slate-500 shadow-2xs">
                  /
                </kbd>
                <span className="text-slate-300">atau</span>
                <kbd className="px-1.5 py-0.5 bg-slate-200/70 border border-slate-300/80 rounded font-semibold text-slate-500 shadow-2xs">
                  {isMac ? '⌘K' : 'Ctrl K'}
                </kbd>
              </div>
            )}
          </div>
        </div>

        {/* Filter Tab Chips & Tombol Pintasan */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onSortChange('top')}
              title="Pintasan: Tekan tombol 1"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                sort === 'top'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Terpopuler</span>
              <kbd className={`ml-0.5 px-1 py-0.2 text-[9px] font-mono rounded font-bold leading-none ${
                sort === 'top' ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-500'
              }`}>
                1
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => onSortChange('newest')}
              title="Pintasan: Tekan tombol 2"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                sort === 'newest'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Terbaru</span>
              <kbd className={`ml-0.5 px-1 py-0.2 text-[9px] font-mono rounded font-bold leading-none ${
                sort === 'newest' ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-500'
              }`}>
                2
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => onSortChange('unanswered')}
              title="Pintasan: Tekan tombol 3"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                sort === 'unanswered'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Belum Terjawab</span>
              <kbd className={`ml-0.5 px-1 py-0.2 text-[9px] font-mono rounded font-bold leading-none ${
                sort === 'unanswered' ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-500'
              }`}>
                3
              </kbd>
              {typeof counts?.unanswered === 'number' && (
                <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold leading-none ${
                  sort === 'unanswered' ? 'bg-white text-sky-600' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.unanswered}
                </span>
              )}
            </button>
          </div>

          {/* Tombol Info Pintasan Keyboard */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            title="Lihat daftar pintasan keyboard (?)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition shrink-0"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Pintasan</span>
            <kbd className="px-1 py-0.5 bg-slate-200/60 rounded text-[9px] font-mono font-bold text-slate-500">?</kbd>
          </button>
        </div>
      </div>

      {/* Daftar Kartu Pertanyaan */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm animate-pulse space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 mx-auto" />
          <div className="h-4 bg-slate-100 rounded w-48 mx-auto" />
          <div className="h-3 bg-slate-100 rounded w-64 mx-auto" />
        </div>
      ) : questions.length === 0 ? (
        sort === 'unanswered' ? (
          <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Semua Pertanyaan Sudah Terjawab! 🎉</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
              Luar biasa! Saat ini tidak ada pertanyaan yang menunggu jawaban. Semua pertanyaan dari peserta telah dijawab oleh narasumber & rekan peserta.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Pertanyaan Baru</span>
            </button>
          </div>
        ) : search ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Pertanyaan Tidak Ditemukan</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
              Tidak ditemukan pertanyaan yang cocok dengan kata kunci &quot;<span className="font-semibold text-slate-700">{search}</span>&quot;.
            </p>
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <span>Reset Pencarian</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Belum Ada Pertanyaan</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
              Jadilah yang pertama mengajukan pertanyaan di forum interaktif ini!
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tanya Sekarang</span>
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q._id}
              question={q}
              userFingerprint={userFingerprint}
              onUpvote={onUpvote}
              onAddAnswer={onAddAnswer}
              isAdmin={isAdmin}
              onStatusChange={onStatusChange}
              onDeleteQuestion={onDeleteQuestion}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) Ajukan Pertanyaan */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-20">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 active:scale-95 transition duration-150 font-semibold text-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="pr-1">Tanya Sesuatu</span>
        </button>
      </div>

      {/* Modal Ajukan Pertanyaan */}
      <AskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={onCreateQuestion}
      />

      {/* Modal Bantuan Pintasan Keyboard */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

