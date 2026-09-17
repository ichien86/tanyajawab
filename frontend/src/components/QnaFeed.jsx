import React, { useState } from 'react';
import { Search, Flame, Clock, HelpCircle, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import QuestionCard from './QuestionCard';
import AskModal from './AskModal';

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

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari pertanyaan atau topik..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        {/* Filter Tab Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => onSortChange('top')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              sort === 'top'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Terpopuler</span>
          </button>

          <button
            type="button"
            onClick={() => onSortChange('newest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              sort === 'newest'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Terbaru</span>
          </button>

          <button
            type="button"
            onClick={() => onSortChange('unanswered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              sort === 'unanswered'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Belum Terjawab</span>
            {typeof counts?.unanswered === 'number' && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold leading-none ${
                sort === 'unanswered' ? 'bg-white text-sky-600' : 'bg-slate-200 text-slate-700'
              }`}>
                {counts.unanswered}
              </span>
            )}
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
    </div>
  );
}

