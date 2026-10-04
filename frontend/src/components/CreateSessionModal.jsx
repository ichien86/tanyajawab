import React, { useState } from 'react';
import { PlusCircle, X, Sparkles, Hash } from 'lucide-react';

export default function CreateSessionModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        session_code: sessionCode.trim().toUpperCase(),
        is_active: isActive
      });
      setTitle('');
      setDescription('');
      setSessionCode('');
      setIsActive(true);
      onClose();
    } catch (err) {
      alert('Gagal membuat sesi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Buat Sesi Forum Baru</h3>
              <p className="text-[11px] text-slate-400">Siapkan forum tanya jawab untuk acara/rapat baru</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Judul Acara / Forum <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Forum Musrenbang 2026, Workshop AI, dll."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan singkat mengenai topik atau panduan bagi peserta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Kode Sesi Kustom (Opsional)
            </label>
            <div className="relative">
              <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Contoh: MSB-26 (Kosongkan untuk otomatis)"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Kode pendek yang akan dimasukkan peserta atau digunakan dalam QR Code (misal: <code>?s=MSB-26</code>).
            </span>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-800">
                Langsung aktifkan sesi (Peserta dapat mengajukan pertanyaan & menjawab)
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Membuat...' : 'Buat Sesi Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
