import React from 'react';
import { Keyboard, X } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      group: 'Pencarian & Navigasi',
      items: [
        {
          keys: ['/'],
          altKeys: ['⌘', 'K'],
          description: 'Fokus ke kolom pencarian pertanyaan / topik'
        },
        {
          keys: ['Esc'],
          description: 'Bersihkan pencarian / keluar dari kolom input'
        },
        {
          keys: ['?'],
          description: 'Buka atau tutup jendela bantuan pintasan ini'
        }
      ]
    },
    {
      group: 'Tab Kategori Pertanyaan',
      items: [
        {
          keys: ['1'],
          description: 'Beralih ke tab pertanyaan "Terpopuler" (upvote tertinggi)'
        },
        {
          keys: ['2'],
          description: 'Beralih ke tab pertanyaan "Terbaru" (urutan terkini)'
        },
        {
          keys: ['3'],
          description: 'Beralih ke tab pertanyaan "Belum Terjawab"'
        }
      ]
    },
    {
      group: 'Aksi Diskusi',
      items: [
        {
          keys: ['C'],
          altKeys: ['N'],
          description: 'Buka formulir ajukan pertanyaan baru'
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Pintasan Keyboard</h3>
              <p className="text-[11px] text-slate-400">Navigasi cepat tanpa perlu sentuh mouse</p>
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {shortcuts.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {group.group}
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                {group.items.map((item, iIdx) => (
                  <div key={iIdx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-700 font-medium leading-tight">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-xs min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                      {item.altKeys && (
                        <>
                          <span className="text-[10px] text-slate-400 px-0.5">atau</span>
                          {item.altKeys.map((ak, akIdx) => (
                            <kbd
                              key={akIdx}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-xs min-w-[24px] text-center"
                            >
                              {ak}
                            </kbd>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-[11px] text-sky-800 leading-relaxed">
            💡 <strong>Tips:</strong> Pintasan tidak aktif saat Anda sedang mengetik di kolom isian teks atau formulir agar pengetikan Anda tidak terganggu.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Tekan <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">Esc</kbd> untuk menutup</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
