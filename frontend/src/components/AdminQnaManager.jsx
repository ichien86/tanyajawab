import React, { useState } from 'react';
import { Search, ShieldCheck, Trash2, Send, FileSpreadsheet, FileText, Download, ClipboardList, MessageSquare, ExternalLink } from 'lucide-react';

export default function AdminQnaManager({
  questions = [],
  token,
  sessionId = 'default_session',
  onStatusChange,
  onDeleteQuestion,
  onAddFacilitatorAnswer,
  onDeleteAnswer,
  onClearAllQuestions
}) {
  const [filter, setFilter] = useState('all'); // all | open | answered | hidden
  const [search, setSearch] = useState('');
  const [replyTextMap, setReplyTextMap] = useState({});

  const filtered = questions.filter((q) => {
    if (filter === 'open' && q.status !== 'open') return false;
    if (filter === 'answered' && q.status !== 'answered') return false;
    if (filter === 'hidden' && q.status !== 'hidden') return false;

    if (search) {
      const c = (q.question?.content || '').toLowerCase();
      const a = (q.question?.author || '').toLowerCase();
      return c.includes(search.toLowerCase()) || a.includes(search.toLowerCase());
    }
    return true;
  });

  const handleSendFacilitatorReply = async (questionId) => {
    const text = replyTextMap[questionId];
    if (!text || !text.trim()) return;

    await onAddFacilitatorAnswer(questionId, text.trim());
    setReplyTextMap((prev) => ({ ...prev, [questionId]: '' }));
  };

  const handleExportExcel = () => {
    window.open(`/api/qna/export/excel?session_id=${sessionId}&token=${token}`, '_blank');
  };

  const handleExportCsv = () => {
    window.open(`/api/qna/export/csv?session_id=${sessionId}&token=${token}`, '_blank');
  };

  const handleDownloadFile = (filename) => {
    fetch(`/api/files/${filename}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Akses berkas ditolak.');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="space-y-4">
      {/* Bar Ekspor & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari pertanyaan / topik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {['all', 'open', 'answered', 'hidden'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                  filter === st
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'Semua' : st === 'open' ? 'Belum Dijawab' : st === 'answered' ? 'Terjawab' : 'Disembunyikan'}
              </button>
            ))}
          </div>
        </div>

        {/* Tombol Ekspor Excel & CSV */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 md:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          {onClearAllQuestions && (
            <button
              type="button"
              onClick={onClearAllQuestions}
              title="Hapus semua pertanyaan dan berkas lampiran pada sesi ini"
              className="flex-1 md:flex-none px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Bersihkan Forum</span>
            </button>
          )}
        </div>
      </div>

      {/* Daftar Moderasi Pertanyaan */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs sm:text-sm">
            Tidak ada pertanyaan dalam kategori ini.
          </div>
        ) : (
          filtered.map((q) => {
            const isStructured = q.question?.response_type === 'structured';
            const fields = q.question?.fields || [];

            return (
              <div
                key={q._id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm space-y-3 ${
                  q.status === 'hidden' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                {/* Header Baris Pertanyaan */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      {q.question?.is_anon ? '🎭 Anonim' : `👤 ${q.question?.author || 'Peserta'}`}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(q.question?.submitted_at || q.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                      {q.upvotes?.length || 0} Upvotes
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isStructured ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isStructured ? `Kuesioner (${fields.length} Pertanyaan)` : 'Teks Bebas'}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    q.status === 'answered' ? 'bg-emerald-100 text-emerald-800' :
                    q.status === 'hidden' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {q.status}
                  </span>
                </div>

                {/* Isi Pertanyaan */}
                <p className="text-slate-900 text-sm font-semibold leading-relaxed">{q.question?.content}</p>

                {/* Jawaban Sebelumnya */}
                {q.answers && q.answers.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Jawaban Masuk ({q.answers.length}):
                    </span>
                    {q.answers.map((ans) => (
                      <div key={ans.answer_id} className="flex items-start justify-between gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{ans.answered_by}</span>
                            {ans.is_facilitator && (
                              <span className="bg-sky-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">
                                Fasilitator
                              </span>
                            )}
                          </div>

                          {/* Detail Jawaban Berstruktur */}
                          {ans.structured_answers && ans.structured_answers.length > 0 ? (
                            <div className="space-y-1 pt-1">
                              {ans.structured_answers.map((sa, sIdx) => {
                                const fDef = fields.find((f) => f.field_id === sa.field_id);
                                return (
                                  <div key={sIdx} className="text-slate-700 bg-slate-50 p-1.5 rounded text-[11px]">
                                    <span className="font-semibold text-slate-500 mr-1">
                                      {fDef?.label || sa.field_id}:
                                    </span>
                                    {sa.file_info ? (
                                      sa.file_info.is_cloud_link ? (
                                        <a
                                          href={sa.file_info.url || sa.value}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sky-700 hover:text-sky-900 font-bold underline inline-flex items-center gap-1"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span>Buka Tautan Online (Drive/Cloud) ↗</span>
                                        </a>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadFile(sa.file_info.filename)}
                                          className="text-sky-700 font-bold underline inline-flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>{sa.file_info.originalname}</span>
                                        </button>
                                      )
                                    ) : typeof sa.value === 'string' && (sa.value.startsWith('http://') || sa.value.startsWith('https://')) ? (
                                      <a
                                        href={sa.value}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sky-700 hover:text-sky-900 font-bold underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Buka Tautan Online ↗</span>
                                      </a>
                                    ) : (
                                      <span className="font-medium text-slate-900">
                                        {Array.isArray(sa.value) ? sa.value.join(', ') : (sa.value || '-')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-800">{ans.content}</p>
                          )}
                        </div>

                        <button
                          onClick={() => onDeleteAnswer(q._id, ans.answer_id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Hapus tanggapan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Balasan Fasilitator */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="Kirim jawaban resmi sebagai Fasilitator..."
                    value={replyTextMap[q._id] || ''}
                    onChange={(e) => setReplyTextMap({ ...replyTextMap, [q._id]: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    onClick={() => handleSendFacilitatorReply(q._id)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>Jawab</span>
                  </button>
                </div>

                {/* Tombol Aksi Moderasi */}
                <div className="flex items-center justify-end gap-1.5 pt-1 text-xs">
                  <button
                    onClick={() => onStatusChange(q._id, q.status === 'answered' ? 'open' : 'answered')}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
                  >
                    {q.status === 'answered' ? 'Tandai Open' : 'Tandai Terjawab'}
                  </button>
                  <button
                    onClick={() => onStatusChange(q._id, q.status === 'hidden' ? 'open' : 'hidden')}
                    className="px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-800 font-medium"
                  >
                    {q.status === 'hidden' ? 'Batal Sembunyi' : 'Sembunyikan'}
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(q._id)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
