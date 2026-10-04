import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import QnaFeed from '../components/QnaFeed';
import SessionQrModal from '../components/SessionQrModal';
import { subscribeToEvents } from '../utils/sseClient';
import { AlertCircle, Lock, Hash, ArrowRight, X, Sparkles } from 'lucide-react';

export default function ParticipantPage() {
  // Ambil parameter sesi dari URL (?s=KODE atau ?session=ID)
  const getInitialSessionParam = () => {
    if (typeof window === 'undefined') return 'default_session';
    const params = new URLSearchParams(window.location.search);
    return params.get('s') || params.get('session') || 'default_session';
  };

  const [sessionQuery, setSessionQuery] = useState(getInitialSessionParam);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionNotFound, setSessionNotFound] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unanswered: 0, answered: 0 });
  const [sort, setSort] = useState('top');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userFingerprint, setUserFingerprint] = useState('');

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [switchCodeInput, setSwitchCodeInput] = useState('');

  const sortRef = useRef(sort);
  const searchRef = useRef(search);
  sortRef.current = sort;
  searchRef.current = search;

  const currentSessionId = session?.session_id || sessionQuery;

  useEffect(() => {
    let fp = localStorage.getItem('tj_device_fingerprint');
    if (!fp) {
      fp = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('tj_device_fingerprint', fp);
    }
    setUserFingerprint(fp);
  }, []);

  const fetchSession = async (targetQuery = sessionQuery) => {
    try {
      setSessionLoading(true);
      const res = await fetch(`/api/admin/session?s=${encodeURIComponent(targetQuery)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSession(data.data);
        setSessionNotFound(false);
        return data.data;
      } else {
        setSessionNotFound(true);
        setSession(null);
        return null;
      }
    } catch (err) {
      console.error('Gagal memuat sesi:', err);
      setSessionNotFound(true);
      return null;
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchQuestions = async (
    targetSort = sortRef.current,
    targetSearch = searchRef.current,
    sid = currentSessionId
  ) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/qna/questions?session_id=${encodeURIComponent(sid)}&sort=${targetSort}&search=${encodeURIComponent(
          targetSearch
        )}`
      );
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  // Muat data sesi awal
  useEffect(() => {
    fetchSession(sessionQuery);
  }, [sessionQuery]);

  // Muat pertanyaan setiap kali sesi atau filter berubah
  useEffect(() => {
    if (session?.session_id) {
      fetchQuestions(sort, search, session.session_id);
    }
  }, [session?.session_id, sort, search]);

  // Langganan SSE Realtime
  useEffect(() => {
    const unsubscribe = subscribeToEvents((event) => {
      if (event.type === 'status') {
        setIsConnected(event.connected);
      } else if (event.type === 'connected') {
        setIsConnected(true);
      } else if (event.type === 'qna_update') {
        if (session?.session_id) {
          fetchQuestions(sortRef.current, searchRef.current, session.session_id);
        }
      } else if (event.type === 'session_update') {
        fetchSession(sessionQuery);
      }
    });

    return unsubscribe;
  }, [session?.session_id, sessionQuery]);

  const handleUpvote = async (questionId) => {
    if (!userFingerprint) return;
    try {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q._id === questionId) {
            const hasVoted = q.upvotes?.includes(userFingerprint);
            const nextUpvotes = hasVoted
              ? (q.upvotes || []).filter((fp) => fp !== userFingerprint)
              : [...(q.upvotes || []), userFingerprint];
            return { ...q, upvotes: nextUpvotes };
          }
          return q;
        })
      );

      await fetch(`/api/qna/questions/${questionId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: userFingerprint })
      });
    } catch (_) {
      fetchQuestions();
    }
  };

  const handleAddAnswer = async (questionId, payload, isRefreshOnly = false) => {
    if (isRefreshOnly) {
      fetchQuestions();
      return;
    }
    const res = await fetch(`/api/qna/questions/${questionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    fetchQuestions();
  };

  const handleCreateQuestion = async (payload) => {
    const sid = session?.session_id || sessionQuery;
    const res = await fetch('/api/qna/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sid,
        ...payload
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    fetchQuestions();
  };

  const handleSwitchSessionSubmit = (e) => {
    e.preventDefault();
    if (!switchCodeInput.trim()) return;
    const cleanCode = switchCodeInput.trim().toUpperCase();
    window.location.search = `?s=${encodeURIComponent(cleanCode)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        isConnected={isConnected}
        session={session}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenSwitchSession={() => {
          setSwitchCodeInput('');
          setIsSwitchModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* Banner Sesi Tidak Ditemukan */}
        {sessionNotFound && !sessionLoading && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-800 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <h3 className="font-bold text-sm sm:text-base">Sesi Tidak Ditemukan</h3>
            </div>
            <p className="text-xs sm:text-sm text-rose-700 leading-relaxed">
              Kode sesi <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200">{sessionQuery}</span> tidak ditemukan atau telah dihapus oleh fasilitator.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="/"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Kembali ke Sesi Utama
              </a>
              <button
                type="button"
                onClick={() => setIsSwitchModalOpen(true)}
                className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
              >
                Masukkan Kode Lain
              </button>
            </div>
          </div>
        )}

        {/* Banner Sesi Ditutup / Nonaktif */}
        {session && !session.is_active && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <p className="font-bold">Sesi Tanya Jawab Sedang Ditutup</p>
              <p className="text-amber-700">
                Fasilitator sedang menjeda atau menutup pengajuan pertanyaan baru pada sesi ini. Anda tetap dapat membaca pertanyaan dan jawaban yang sudah ada.
              </p>
            </div>
          </div>
        )}

        {/* Feed Tanya Jawab */}
        {!sessionNotFound && (
          <QnaFeed
            questions={questions}
            counts={counts}
            loading={loading || sessionLoading}
            userFingerprint={userFingerprint}
            onUpvote={handleUpvote}
            onAddAnswer={handleAddAnswer}
            onCreateQuestion={handleCreateQuestion}
            sort={sort}
            onSortChange={setSort}
            search={search}
            onSearchChange={setSearch}
            isSessionActive={session?.is_active ?? true}
          />
        )}
      </main>

      {/* Modal QR Code Peserta */}
      <SessionQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        session={session}
      />

      {/* Modal Ganti / Gabung Sesi */}
      {isSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <Hash className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-sm">Gabung ke Sesi Lain</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitchModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSwitchSessionSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kode Sesi Acara / Forum
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: MSB-26"
                  value={switchCodeInput}
                  onChange={(e) => setSwitchCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-center tracking-widest font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  Masukkan kode unik sesi yang diberikan oleh fasilitator atau panitia acara.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSwitchModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  <span>Gabung</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
