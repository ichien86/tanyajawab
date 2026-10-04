import React from 'react';
import { MessageSquare, QrCode, Hash } from 'lucide-react';

export default function Navbar({ isConnected, session, onOpenQr, onOpenSwitchSession }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Info Acara & Forum Tanya Jawab */}
          <div className="flex items-center gap-2.5 min-w-0">
            <a
              href="/"
              title="Kembali ke Beranda Utama"
              className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-700 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 transition active:scale-95"
            >
              <MessageSquare className="w-5 h-5" />
            </a>
            <div className="truncate">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {session?.title || 'Forum Tanya Jawab'}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <span className="font-mono font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[11px]">
                  {session?.session_code || session?.session_id || 'DEFAULT'}
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="truncate hidden sm:inline">
                  {session?.description || 'Sosialisasi & Forum Interaktif'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (QR Code, Ganti Sesi, Status Koneksi) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Tombol QR Code Peserta */}
            <button
              type="button"
              onClick={onOpenQr}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold flex items-center gap-1 transition"
              title="Tampilkan QR Code Sesi Ini"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Sesi</span>
            </button>

            {/* Tombol Ganti Sesi */}
            <button
              type="button"
              onClick={onOpenSwitchSession}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
              title="Ganti atau Gabung Sesi Lain"
            >
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Ganti</span>
            </button>

            {/* Status Koneksi Realtime SSE */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold bg-slate-100 flex-shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-slate-600 hidden md:inline">
                {isConnected ? 'Live' : '...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
