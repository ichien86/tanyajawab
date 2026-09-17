import React from 'react';
import { MessageSquare, Radio } from 'lucide-react';

export default function Navbar({ isConnected, session }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Info Acara & Forum Tanya Jawab */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {session?.title || 'Forum Tanya Jawab & Identifikasi Lapangan'}
              </h1>
              <p className="text-xs text-slate-500 truncate">
                {session?.session_code ? `Kode Sesi: ${session.session_code}` : 'Sosialisasi & Forum Interaktif'}
              </p>
            </div>
          </div>

          {/* Status Koneksi Realtime SSE */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-slate-600 hidden sm:inline">{isConnected ? 'Live Terhubung' : 'Menghubungkan...'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
