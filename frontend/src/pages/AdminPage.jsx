import React, { useState, useEffect } from 'react';
import { Shield, Lock, LogOut, MessageSquare, Settings, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import AdminQnaManager from '../components/AdminQnaManager';

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('tj_admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tj_admin_info') || 'null');
    } catch (_) {
      return null;
    }
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('qna'); // 'qna' | 'session'
  const [stats, setStats] = useState(null);
  const [sessionData, setSessionData] = useState({ title: '', session_code: '', is_active: true, description: '' });
  const [questions, setQuestions] = useState([]);
  const [sessionSaveMsg, setSessionSaveMsg] = useState('');

  // State untuk Ganti Kata Sandi / Passcode
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

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

  const fetchAdminData = async () => {
    if (!token) return;

    try {
      const [resStats, resQna, resSess] = await Promise.all([
        fetch('/api/admin/stats?session_id=default_session', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/qna/questions?session_id=default_session&include_hidden=true&is_admin=true', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/session?session_id=default_session', { headers: { 'Authorization': `Bearer ${token}` } })
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
      if (dataSess.success && dataSess.data) setSessionData(dataSess.data);
    } catch (err) {
      console.error('Gagal memuat data admin:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleStatusChange = async (questionId, newStatus) => {
    try {
      const res = await fetch(`/api/qna/questions/${questionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Yakin ingin menghapus pertanyaan ini?')) return;
    try {
      const res = await fetch(`/api/qna/questions/${questionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData();
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          answered_by: adminUser?.username ? `Fasilitator (${adminUser.username})` : 'Fasilitator',
          is_facilitator: true
        })
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert('Gagal mengirim tanggapan fasilitator: ' + err.message);
    }
  };

  const handleDeleteAnswer = async (questionId, answerId) => {
    try {
      const res = await fetch(`/api/qna/questions/${questionId}/answers/${answerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert('Gagal menghapus jawaban: ' + err.message);
    }
  };

  const handleClearAllQuestions = async () => {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA pertanyaan dan seluruh berkas lampiran pada sesi ini? Tindakan ini permanen dan tidak dapat dibatalkan.')) return;
    try {
      const res = await fetch('/api/qna/session/default_session/clear-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminData();
        alert('Seluruh pertanyaan dan berkas lampiran berhasil dibersihkan.');
      } else {
        const d = await res.json();
        alert('Gagal membersihkan: ' + (d.message || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Gagal membersihkan sesi: ' + err.message);
    }
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    setSessionSaveMsg('');
    try {
      const res = await fetch('/api/admin/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: 'default_session',
          ...sessionData
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSessionSaveMsg('Pengaturan sesi berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui sesi: ' + err.message);
    }
  };

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
          'Authorization': `Bearer ${token}`
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

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Portal Admin Tersembunyi</h2>
            <p className="text-xs text-slate-500">
              Autentikasi tingkat tinggi dengan proteksi brute-force & pembatasan akses.
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username Admin
              </label>
              <input
                type="text"
                placeholder="Masukkan username admin"
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
              {loggingIn ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <a href="/" className="text-xs text-slate-400 hover:text-slate-600">
              ← Kembali ke Layar Peserta
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">Panel Admin & Fasilitator</span>
                <span className="text-[10px] bg-sky-600 px-1.5 py-0.5 rounded font-bold uppercase">
                  {adminUser?.role || 'Administrator'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Masuk sebagai: <span className="text-slate-200 font-semibold">{adminUser?.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition hidden sm:inline"
            >
              Buka Layar Peserta ↗
            </a>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs rounded-lg font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Tab Navigasi Admin */}
        <div className="max-w-5xl mx-auto px-4 flex gap-2 border-t border-slate-800 pt-1 pb-2 text-xs">
          {[
            { id: 'qna', label: 'Moderasi Tanya Jawab & Ekspor', icon: MessageSquare },
            { id: 'session', label: 'Pengaturan Sesi & Keamanan', icon: Settings }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition ${
                  activeTab === t.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Ringkasan Statistik */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pertanyaan</span>
              <span className="text-xl font-extrabold text-slate-900">{stats.totalQuestions}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Format Kuesioner</span>
              <span className="text-xl font-extrabold text-indigo-600">{stats.structuredQuestionsCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sudah Dijawab</span>
              <span className="text-xl font-extrabold text-emerald-600">{stats.answeredQuestions}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Jawaban</span>
              <span className="text-xl font-extrabold text-sky-600">{stats.totalAnswers}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peserta Live</span>
              <span className="text-xl font-extrabold text-emerald-500 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.activeClients}
              </span>
            </div>
          </div>
        )}

        {/* Tab Moderasi Tanya Jawab */}
        {activeTab === 'qna' && (
          <AdminQnaManager
            questions={questions}
            token={token}
            sessionId="default_session"
            onStatusChange={handleStatusChange}
            onDeleteQuestion={handleDeleteQuestion}
            onAddFacilitatorAnswer={handleAddFacilitatorAnswer}
            onDeleteAnswer={handleDeleteAnswer}
            onClearAllQuestions={handleClearAllQuestions}
          />
        )}

        {/* Tab Pengaturan Sesi & Keamanan */}
        {activeTab === 'session' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Kartu 1: Pengaturan Sesi */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Settings className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base">Pengaturan Sesi Forum</h3>
              </div>

              {sessionSaveMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{sessionSaveMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Acara / Forum</label>
                  <input
                    type="text"
                    required
                    value={sessionData.title}
                    onChange={(e) => setSessionData({ ...sessionData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Ringkas</label>
                  <textarea
                    rows={2}
                    value={sessionData.description}
                    onChange={(e) => setSessionData({ ...sessionData, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Sesi</label>
                  <input
                    type="text"
                    value={sessionData.session_code}
                    onChange={(e) => setSessionData({ ...sessionData, session_code: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
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
                      Sesi Aktif (Peserta dapat bertanya & menjawab)
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
                <h3 className="font-bold text-base">Ganti Kata Sandi / Passcode Admin</h3>
              </div>
              <p className="text-xs text-slate-500">
                Ubah passcode yang digunakan untuk mengakses halaman <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">/admin</span> ini.
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
                    placeholder="Masukkan sandi lama"
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
    </div>
  );
}
