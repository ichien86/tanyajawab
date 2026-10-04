import React, { useState } from 'react';
import {
  MessageSquare,
  QrCode,
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  Radio,
  FileText,
  Hash
} from 'lucide-react';

export default function LandingPage() {
  const [sessionCodeInput, setSessionCodeInput] = useState('');

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (!sessionCodeInput.trim()) return;
    const clean = sessionCodeInput.trim();
    window.location.href = `/?s=${encodeURIComponent(clean)}`;
  };

  const features = [
    {
      icon: Layers,
      color: 'bg-sky-50 text-sky-600',
      badge: 'Multi-Tenant',
      title: 'Manajemen Multi-Sesi Mandiri',
      desc: 'Setiap forum, rapat, atau kelas memiliki ruang sesi terpisah dengan kode unik dan tautan langsung (/?s=KODE_SESI).'
    },
    {
      icon: QrCode,
      color: 'bg-emerald-50 text-emerald-600',
      badge: 'Mobile Friendly',
      title: 'Generator QR Code Siap Proyektor',
      desc: 'Tampilkan QR Code beresolusi tinggi di layar panggung. Peserta cukup mengarahkan kamera smartphone tanpa instal aplikasi.'
    },
    {
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      badge: 'Fleksibel',
      title: 'Format Kuesioner & Pilihan Ganda',
      desc: 'Dukungan pertanyaan berstruktur kuesioner: pilihan ganda, kotak centang, isian teks, serta unggah dokumen/foto dengan proteksi Magic-Bytes.'
    },
    {
      icon: Radio,
      color: 'bg-rose-50 text-rose-600',
      badge: 'Real-time',
      title: 'Live Updates Tanpa Refresh (SSE)',
      desc: 'Pertanyaan baru, tanggapan fasilitator, dan pemungutan suara (upvote) langsung muncul seketika di semua layar perangkat.'
    },
    {
      icon: FileSpreadsheet,
      color: 'bg-amber-50 text-amber-600',
      badge: 'Rekap Cepat',
      title: 'Ekspor Laporan Lengkap (Excel & CSV)',
      desc: 'Unduh seluruh riwayat aspirasi, jawaban responden kuesioner, dan catatan fasilitator ke file spreadsheet (.xlsx) dan CSV dalam 1 klik.'
    },
    {
      icon: Shield,
      color: 'bg-purple-50 text-purple-600',
      badge: 'Google OAuth',
      title: 'Hak Akses Superadmin & Admin Sesi',
      desc: 'Superadmin mengelola seluruh sesi secara komprehensif, sedangkan fasilitator/admin sesi mandiri mengelola ruang diskusi miliknya.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Header Utama */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">TanyaJawab</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] uppercase tracking-wider">
                  Platform Forum
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Forum Aspirasi, Tanya Jawab & Kuesioner Interaktif</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Masuk sebagai Admin</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-14 sm:pt-16 sm:pb-20 border-b border-slate-200 bg-gradient-to-b from-white via-sky-50/30 to-slate-50">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Platform Tanya Jawab Multi-Sesi & Kuesioner Lapangan</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
            Ruang Kolaborasi Tanya Jawab & Aspirasi Lapangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Multi-Sesi</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Wadahi aspirasi, ajukan pertanyaan, polling kuesioner terstruktur, dan bagikan QR Code sesi langsung ke smartphone peserta tanpa perlu registrasi atau instal aplikasi.
          </p>

          {/* Dual Action Cards: Gabung Sesi & Akses Fasilitator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left max-w-4xl mx-auto pt-4">
            {/* Kartu 1: Untuk Peserta (Gabung Sesi) */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Gabung ke Sesi Forum</h3>
                  <p className="text-xs text-slate-500">
                    Masukkan kode sesi acara untuk langsung bergabung dan berpartisipasi dalam sesi forum tanya jawab.
                  </p>
                </div>

                <form onSubmit={handleJoinSession} className="space-y-3 pt-1">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Masukkan Kode Sesi (misal: pokir_2028)"
                      value={sessionCodeInput}
                      onChange={(e) => setSessionCodeInput(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono uppercase tracking-wider"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <span>Masuk ke Forum Sesi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Atau scan QR Code sesi yang dibagikan fasilitator untuk langsung bergabung.</span>
              </div>
            </div>

            {/* Kartu 2: Untuk Fasilitator / Admin (Google Login) */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Buat & Kelola Sesi Forum</h3>
                  <p className="text-xs text-slate-500">
                    Masuk dengan akun Google Anda untuk membuat ruang sesi baru, memoderasi pertanyaan, dan mengunduh QR Code.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dukungan Akun Google (OAuth 2.0)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Setiap fasilitator yang masuk dengan akun Gmail dapat membuat dan mengelola sesi miliknya secara mandiri.
                  </p>
                </div>
              </div>

              <div>
                <a
                  href="/admin"
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Masuk sebagai Admin / Fasilitator</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Fitur-Fitur Aplikasi */}
      <section className="py-16 sm:py-20 max-w-6xl w-full mx-auto px-4 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Fitur Lengkap</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Didesain Khusus untuk Forum Interaktif Lapangan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Fitur lengkap yang memudahkan kolaborasi antara panitia, narasumber, dan peserta forum dalam satu wadah.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-2xl ${feat.color} flex items-center justify-center font-bold`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 leading-snug">{feat.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800">TanyaJawab</span>
            <span>— Platform Forum Aspirasi & Kuesioner Interaktif 2026</span>
          </div>

          <div className="flex items-center gap-4 font-semibold">
            <a href="/admin" className="hover:text-sky-600 transition">
              Portal Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
