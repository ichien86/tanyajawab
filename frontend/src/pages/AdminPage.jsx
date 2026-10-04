import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  LogOut,
  MessageSquare,
  Settings,
  CheckCircle,
  AlertTriangle,
  KeyRound,
  QrCode,
  PlusCircle,
  Layers,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Users,
  ChevronDown,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import AdminQnaManager from '../components/AdminQnaManager';
import CreateSessionModal from '../components/CreateSessionModal';
import SessionQrModal from '../components/SessionQrModal';

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('tj_admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tj_admin_info') || 'null');
    } catch (_) {
      return null;
    }
  });

  // Auth config (Google Client ID, setup mode)
  const [authConfig, setAuthConfig] = useState({ google_client_id: '', setup_mode: false });
  const [showPasscodeFallback, setShowPasscodeFallback] = useState(false);

  // Local / Passcode Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [loggingIn, setLoggingIn] = useState(false);

  // Multi-Session State
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('default_session');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModalSession, setQrModalSession] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // Tab State: 'qna' | 'sessions' | 'settings'
  const [activeTab, setActiveTab] = useState('qna');
  const [stats, setStats] = useState(null);
  const [sessionData, setSessionData] = useState({
    session_id: 'default_session',
    title: '',
    session_code: '',
    is_active: true,
    description: ''
  });
  const [questions, setQuestions] = useState([]);
  const [sessionSaveMsg, setSessionSaveMsg] = useState('');

  // Password / Passcode change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Fetch Auth Config on load
  useEffect(() => {
    fetch('/api/admin/auth-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAuthConfig(data);
          if (data.setup_mode || !data.google_client_id) {
            setShowPasscodeFallback(true);
          }
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil konfigurasi auth:', err);
        setShowPasscodeFallback(true);
      });
  }, []);

  // Initialize Google Identity Services if client ID available
  useEffect(() => {
    if (token || !authConfig.google_client_id) return;

    const loadGoogleScript = () => {
      if (document.getElementById('google-gsi-script')) {
        initGoogleBtn();
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleBtn();
      document.body.appendChild(script);
    };

    const initGoogleBtn = () => {
      if (!window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: authConfig.google_client_id,
          callback: handleGoogleLoginSuccess
        });

        const btnContainer = document.getElementById('googleSignInBtn');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill'
          });
        }
      } catch (err) {
        console.error('Inisialisasi Google Sign-In gagal:', err);
      }
    };

    const timer = setTimeout(loadGoogleScript, 200);
    return () => clearTimeout(timer);
  }, [token, authConfig.google_client_id, showPasscodeFallback]);

  // Google Login Callback
  const handleGoogleLoginSuccess = async (response) => {
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login dengan Google gagal.');
      }

      setToken(data.token);
      setAdminUser(data.admin);
      localStorage.setItem('tj_admin_token', data.token);
      localStorage.setItem('tj_admin_info', JSON.stringify(data.admin));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  // Lockout Timer countdown
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Fallback Passcode Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.lockoutRemaining) {
          setLockoutTimer(data.lockoutRemaining);
        }
        throw new Error(data.message || 'Login gagal.');
      }

      setToken(data.token);
      setAdminUser(data.admin);
      localStorage.setItem('tj_admin_token', data.token);
      localStorage.setItem('tj_admin_info', JSON.stringify(data.admin));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('tj_admin_token');
    localStorage.removeItem('tj_admin_info');
  };

  // Fetch all sessions
  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSessions(data.data);
        // Jika sesi terpilih saat ini tidak ada di daftar sesi, pilih sesi pertama
        if (!data.data.some((s) => s.session_id === selectedSessionId) && data.data.length > 0) {
          setSelectedSessionId(data.data[0].session_id);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar sesi:', err);
    }
  };

  // Fetch data for the currently selected session
  const fetchSessionDetails = async () => {
    if (!token || !selectedSessionId) return;

    try {
      const [resStats, resQna, resSess] = await Promise.all([
        fetch(`/api/admin/stats?session_id=${encodeURIComponent(selectedSessionId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/qna/questions?session_id=${encodeURIComponent(selectedSessionId)}&include_hidden=true&is_admin=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/admin/session?session_id=${encodeURIComponent(selectedSessionId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (resStats.status === 401) {
        handleLogout();
        return;
      }

      const [dataStats, dataQna, dataSess] = await Promise.all([
        resStats.json(),
        resQna.json(),
        resSess.json()
      ]);

      if (dataStats.success) setStats(dataStats.data);
      if (dataQna.success) setQuestions(dataQna.data || []);
      if (dataSess.success && dataSess.data) {
        setSessionData(dataSess.data);
      }
    } catch (err) {
      console.error('Gagal memuat data sesi:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedSessionId) {
      fetchSessionDetails();
    }
  }, [token, selectedSessionId]);

  // Handler CRUD Sesi
  const handleCreateSession = async (payload) => {
    const res = await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Gagal membuat sesi');
    }

    await fetchSessions();
    if (data.data?.session_id) {
      setSelectedSessionId(data.data.session_id);
    }
  };

  const handleDeleteSession = async (sessId, sessTitle) => {
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus sesi "${sessTitle}" beserta seluruh pertanyaan dan berkasnya? Tindakan ini permanen.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/sessions/${sessId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      alert('Sesi berhasil dihapus.');
      await fetchSessions();
      if (selectedSessionId === sessId) {
        setSelectedSessionId('default_session');
      }
    } catch (err) {
      alert('Gagal menghapus sesi: ' + err.message);
    }
  };

  const handleToggleSessionStatus = async (sess) => {
    try {
      const res = await fetch(`/api/admin/sessions/${sess.session_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !sess.is_active })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchSessions();
      if (sess.session_id === selectedSessionId) {
        setSessionData((prev) => ({ ...prev, is_active: !sess.is_active }));
      }
    } catch (err) {
      alert('Gagal mengubah status sesi: ' + err.message);
    }
  };

  const handleCopyLink = (sess) => {
    const host = typeof window !== 'undefined' ? window.location.origin : 'https://tanyajawab-app.fly.dev';
    const link = `${host}/?s=${sess.session_code || sess.session_id}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(sess.session_id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // Moderasi Pertanyaan Handlers
  const handleStatusChange = async (questionId, newStatus) => {
    try {
      const res = await fetch(`/api/qna/questions/${questionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchSessionDetails();
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Yakin ingin menghapus pertanyaan ini?')) return;
    try {
      const res = await fetch(`/api/qna/questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchSessionDetails();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleAddFacilitatorAnswer = async (questionId, content) => {
    try {
      const res = await fetch(`/api/qna/questions/${questionId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          answered_by: adminUser?.name || adminUser?.username || 'Fasilitator',
          is_facilitator: true
        })
      });
      if (res.ok) fetchSessionDetails();
    } catch (err) {
      alert('Gagal mengirim tanggapan fasilitator: ' + err.message);
    }
  };

  const handleDeleteAnswer = async (questionId, answerId) => {
    try {
      const res = await fetch(`/api/qna/questions/${questionId}/answers/${answerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchSessionDetails();
    } catch (err) {
      alert('Gagal menghapus jawaban: ' + err.message);
    }
  };

  const handleClearAllQuestions = async () => {
    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA pertanyaan dan seluruh berkas lampiran pada sesi "${sessionData.title || selectedSessionId}"? Tindakan ini permanen.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/qna/session/${encodeURIComponent(selectedSessionId)}/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSessionDetails();
        fetchSessions();
        alert('Seluruh pertanyaan dan berkas lampiran berhasil dibersihkan.');
      } else {
        const d = await res.json();
        alert('Gagal membersihkan: ' + (d.message || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Gagal membersihkan sesi: ' + err.message);
    }
  };

  // Simpan Pengaturan Sesi Aktif
  const handleSaveSession = async (e) => {
    e.preventDefault();
    setSessionSaveMsg('');
    try {
      const res = await fetch('/api/admin/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: selectedSessionId,
          ...sessionData
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSessionSaveMsg('Pengaturan sesi berhasil diperbarui!');
      fetchSessions();
    } catch (err) {
      alert('Gagal memperbarui sesi: ' + err.message);
    }
  };

  // Ganti Kata Sandi Admin
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdMsg('');

    if (newPassword !== confirmPassword) {
      setPwdError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('Kata sandi / passcode baru minimal 6 karakter.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Gagal memperbarui kata sandi.');

      setPwdMsg(data.message || 'Kata sandi / passcode admin berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  // Dapatkan sesi saat ini
  const currentSession = sessions.find((s) => s.session_id === selectedSessionId) || sessionData;

  // ----------------------------------------------------
  // LAYAR LOGIN (JIKA BELUM MASUK)
  // ----------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Portal Admin & Fasilitator</h2>
            <p className="text-xs text-slate-500">
              Masuk untuk membuat sesi forum, mengelola pertanyaan peserta, dan membagikan QR Code.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {lockoutTimer > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Terkunci karena proteksi brute-force. Coba lagi dalam {lockoutTimer} detik.</span>
            </div>
          )}

          {/* Opsi 1: Google Sign-In (Utama) */}
          {authConfig.google_client_id && !showPasscodeFallback && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs font-medium text-slate-600 mb-3">
                  Masuk menggunakan akun Google Anda:
                </p>
                <div id="googleSignInBtn" className="flex justify-center min-h-[44px]">
                  <div className="text-xs text-slate-400 py-2">Memuat Google Sign-In...</div>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase tracking-wider">atau</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasscodeFallback(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Masuk dengan Passcode Darurat</span>
              </button>
            </div>
          )}

          {/* Setup Notice jika GOOGLE_CLIENT_ID belum diatur */}
          {(!authConfig.google_client_id || showPasscodeFallback) && (
            <div>
              {authConfig.setup_mode && !authConfig.google_client_id && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-[11px] text-sky-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-sky-900">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Mode Pengaturan Awal (Setup)</span>
                  </div>
                  <p>
                    Google OAuth Client ID belum dikonfigurasi di Fly.io secrets. Silakan gunakan passcode admin darurat untuk masuk.
                  </p>
                </div>
              )}

              {/* Form Passcode / Password Darurat */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Username Admin
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan username (opsional)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi / Passcode
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi / passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loggingIn || lockoutTimer > 0}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition"
                >
                  {loggingIn ? 'Memverifikasi...' : 'Masuk dengan Passcode'}
                </button>

                {authConfig.google_client_id && (
                  <button
                    type="button"
                    onClick={() => setShowPasscodeFallback(false)}
                    className="w-full text-center text-xs text-sky-600 hover:text-sky-800 font-medium pt-1"
                  >
                    ← Kembali ke Login Google
                  </button>
                )}
              </form>
            </div>
          )}

          <div className="pt-2 text-center">
            <a href="/" className="text-xs text-slate-400 hover:text-slate-600">
              ← Kembali ke Layar Peserta
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LAYAR DASHBOARD ADMIN (SETELAH MASUK)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header Admin */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Identitas Profil Admin */}
          <div className="flex items-center gap-3 min-w-0">
            {adminUser?.picture ? (
              <img
                src={adminUser.picture}
                alt={adminUser.name || 'Admin'}
                className="w-9 h-9 rounded-xl border-2 border-sky-400 shadow-sm object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base truncate">
                  {adminUser?.name || adminUser?.username || 'Panel Admin'}
                </span>
                <span className="text-[10px] bg-sky-600 text-sky-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
                  {adminUser?.role === 'superadmin' ? 'Superadmin' : 'Fasilitator'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {adminUser?.email || adminUser?.username || 'admin'}
              </p>
            </div>
          </div>

          {/* Quick Actions & Logout */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Tombol QR Code Cepat */}
            <button
              type="button"
              onClick={() => setQrModalSession(currentSession)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium transition flex items-center gap-1.5 border border-slate-700"
              title="Tampilkan QR Code untuk peserta"
            >
              <QrCode className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">QR Sesi</span>
            </button>

            {/* Tombol Buka Layar Peserta */}
            <a
              href={`/?s=${currentSession?.session_code || currentSession?.session_id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium transition hidden md:flex items-center gap-1 border border-slate-700"
            >
              <span>Layar Peserta</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Tab Navigasi Admin & Session Selector Bar */}
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-800/80 pt-2 pb-2 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'qna', label: 'Moderasi Tanya Jawab', icon: MessageSquare },
              { id: 'sessions', label: 'Kelola Semua Sesi', icon: Layers, badge: sessions.length },
              { id: 'settings', label: 'Pengaturan Sesi Ini', icon: Settings }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                    activeTab === t.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-slate-700 text-slate-200 rounded-full text-[10px] font-bold">
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Session Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden lg:inline">Sesi Aktif:</span>
            <div className="relative flex-1 sm:w-60">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer truncate"
              >
                {sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.title} ({s.session_code || s.session_id})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center gap-1 transition shrink-0"
              title="Buat Sesi Forum Baru"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sesi Baru</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Banner Sesi Aktif */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                  {currentSession?.title || 'Sesi Tanya Jawab'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    currentSession?.is_active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {currentSession?.is_active ? 'Sesi Aktif' : 'Sesi Ditutup'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                  Kode: {currentSession?.session_code || currentSession?.session_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {currentSession?.description || 'Tidak ada deskripsi sesi.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleCopyLink(currentSession)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              {copiedCode === currentSession?.session_id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tautan Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setQrModalSession(currentSession)}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Statistik Sesi Ini */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Pertanyaan
              </span>
              <span className="text-xl font-extrabold text-slate-900">{stats.totalQuestions}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Format Kuesioner
              </span>
              <span className="text-xl font-extrabold text-indigo-600">{stats.structuredQuestionsCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sudah Dijawab
              </span>
              <span className="text-xl font-extrabold text-emerald-600">{stats.answeredQuestions}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Jawaban
              </span>
              <span className="text-xl font-extrabold text-sky-600">{stats.totalAnswers}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Peserta Live
              </span>
              <span className="text-xl font-extrabold text-emerald-500 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.activeClients}
              </span>
            </div>
          </div>
        )}

        {/* TAB 1: MODERASI TANYA JAWAB */}
        {activeTab === 'qna' && (
          <AdminQnaManager
            questions={questions}
            token={token}
            sessionId={selectedSessionId}
            onStatusChange={handleStatusChange}
            onDeleteQuestion={handleDeleteQuestion}
            onAddFacilitatorAnswer={handleAddFacilitatorAnswer}
            onDeleteAnswer={handleDeleteAnswer}
            onClearAllQuestions={handleClearAllQuestions}
          />
        )}

        {/* TAB 2: KELOLA SEMUA SESI (MULTI-SESSION MANAGEMENT) */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Daftar Sesi Forum Anda</h3>
                <p className="text-xs text-slate-500">
                  Kelola sesi terpisah untuk berbagai kegiatan, acara, atau kelas Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Sesi Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((sess) => {
                const isSelected = sess.session_id === selectedSessionId;
                return (
                  <div
                    key={sess.session_id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Kode & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                          {sess.session_code || sess.session_id}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSessionStatus(sess)}
                            className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase transition flex items-center gap-1 ${
                              sess.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Klik untuk mengubah status aktif/nonaktif"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sess.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{sess.is_active ? 'Aktif' : 'Tutup'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Judul & Deskripsi */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">
                          {sess.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {sess.description || 'Tidak ada deskripsi tambahan.'}
                        </p>
                      </div>

                      {/* Creator info */}
                      {sess.owner_email && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>Dibuat oleh:</span>
                          <span className="font-medium text-slate-600 truncate">{sess.owner_email}</span>
                        </div>
                      )}

                      {/* Mini Stats */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tanya</div>
                          <div className="text-sm font-extrabold text-slate-800">{sess.totalQuestions || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Dijawab</div>
                          <div className="text-sm font-extrabold text-emerald-600">{sess.answeredQuestions || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tanggapan</div>
                          <div className="text-sm font-extrabold text-sky-600">{sess.totalAnswers || 0}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Card */}
                    <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-50 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(sess.session_id);
                          setActiveTab('qna');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Buka Moderasi' : 'Pilih Sesi'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* QR Code */}
                        <button
                          type="button"
                          onClick={() => setQrModalSession(sess)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Tampilkan QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(sess)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Salin Tautan Peserta"
                        >
                          {copiedCode === sess.session_id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Buka Layar Peserta */}
                        <a
                          href={`/?s=${sess.session_code || sess.session_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Buka Layar Peserta di Tab Baru"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Hapus Sesi (jika bukan default_session) */}
                        {sess.session_id !== 'default_session' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(sess.session_id, sess.title)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PENGATURAN SESI INI & KEAMANAN */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Kartu 1: Pengaturan Sesi Aktif */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Settings className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base">Pengaturan Sesi Forum Ini</h3>
              </div>
              <p className="text-xs text-slate-500">
                Ubah informasi sesi yang sedang aktif dipilih ({sessionData.session_id}).
              </p>

              {sessionSaveMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4" />
                  <span>{sessionSaveMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Acara / Forum
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionData.title}
                    onChange={(e) => setSessionData({ ...sessionData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi Ringkas
                  </label>
                  <textarea
                    rows={2}
                    value={sessionData.description}
                    onChange={(e) => setSessionData({ ...sessionData, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Sesi Kustom</label>
                  <input
                    type="text"
                    value={sessionData.session_code}
                    onChange={(e) => setSessionData({ ...sessionData, session_code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: MSB-26"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Peserta dapat bergabung menggunakan tautan <span className="font-mono">/?s={sessionData.session_code || sessionData.session_id}</span>
                  </p>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sessionData.is_active}
                      onChange={(e) => setSessionData({ ...sessionData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      Sesi Aktif (Peserta dapat mengajukan pertanyaan baru)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition"
                >
                  Simpan Pengaturan Sesi
                </button>
              </form>
            </div>

            {/* Kartu 2: Keamanan & Ganti Passcode Admin */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base">Ganti Kata Sandi / Passcode Akun</h3>
              </div>
              <p className="text-xs text-slate-500">
                Ubah passcode yang digunakan untuk akses login darurat tanpa akun Google.
              </p>

              {pwdMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4" />
                  <span>{pwdMsg}</span>
                </div>
              )}

              {pwdError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{pwdError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi / Passcode Saat Ini
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan sandi saat ini"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi / Passcode Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ulangi Kata Sandi / Passcode Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang sandi baru"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{pwdLoading ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Modal Buat Sesi Baru */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSession}
      />

      {/* Modal QR Code Sesi */}
      <SessionQrModal
        isOpen={Boolean(qrModalSession)}
        onClose={() => setQrModalSession(null)}
        session={qrModalSession}
      />
    </div>
  );
}
