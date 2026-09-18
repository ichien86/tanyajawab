import React, { useState } from 'react';
import { ThumbsUp, MessageCircle, Send, CheckCircle2, Clock, ShieldCheck, ChevronDown, ChevronUp, ClipboardList, MessageSquare, Download, FileText, ExternalLink, Link2 } from 'lucide-react';
import { isFieldVisible } from '../utils/conditionEngine';
import FileUploadField from './FileUploadField';

export default function QuestionCard({
  question,
  userFingerprint,
  onUpvote,
  onAddAnswer,
  isAdmin = false,
  onStatusChange,
  onDeleteQuestion
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerAuthor, setAnswerAuthor] = useState('');
  const [freeTextContent, setFreeTextContent] = useState('');
  const [structuredAnswers, setStructuredAnswers] = useState({});
  const [otherTextMap, setOtherTextMap] = useState({});
  const [uploadedFile, setUploadedFile] = useState(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasUpvoted = question.upvotes?.includes(userFingerprint);
  const upvoteCount = question.upvotes?.length || 0;
  const answers = question.answers || [];
  const answerCount = answers.length;
  const isStructured = question.question?.response_type === 'structured';
  const fields = question.question?.fields || [];

  const handleFieldAnswerChange = (fieldId, val) => {
    setStructuredAnswers((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleCheckboxToggle = (fieldId, option) => {
    const current = Array.isArray(structuredAnswers[fieldId]) ? structuredAnswers[fieldId] : [];
    const next = current.includes(option) ? current.filter((x) => x !== option) : [...current, option];
    handleFieldAnswerChange(fieldId, next);
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isStructured) {
      // Validasi pertanyaan wajib yang terlihat
      for (const f of fields) {
        if (isFieldVisible(f, structuredAnswers)) {
          if (f.type === 'file') {
            const currentVal = structuredAnswers[f.field_id];
            const hasCloudLink = typeof currentVal === 'string' && (currentVal.trim().startsWith('http://') || currentVal.trim().startsWith('https://'));
            if (f.required && !uploadedFile && !hasCloudLink) {
              setErrorMsg(`Berkas atau tautan online pada "${f.label}" wajib diisi.`);
              return;
            }
          } else {
            const val = structuredAnswers[f.field_id];
            if (f.required && (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))) {
              setErrorMsg(`Pertanyaan "${f.label}" wajib diisi.`);
              return;
            }
            if (f.required && (val === 'Lainnya' || val === 'Lainnya:' || (Array.isArray(val) && val.some((x) => x === 'Lainnya' || x === 'Lainnya:')))) {
              setErrorMsg(`Silakan tuliskan isian untuk pilihan "Lainnya" pada "${f.label}".`);
              return;
            }
          }
        }
      }
    } else {
      if (!freeTextContent.trim()) return;
    }

    setSubmittingAnswer(true);
    try {
      if (isStructured) {
        const formData = new FormData();
        formData.append('answered_by', answerAuthor.trim() || (isAdmin ? 'Fasilitator' : 'Peserta'));
        formData.append('is_facilitator', isAdmin);
        formData.append('answers', JSON.stringify(structuredAnswers));
        if (uploadedFile) {
          formData.append('file', uploadedFile);
        }

        const res = await fetch(`/api/qna/questions/${question._id}/answers`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (onAddAnswer) onAddAnswer(question._id, null, true);
      } else {
        await onAddAnswer(question._id, {
          content: freeTextContent.trim(),
          answered_by: answerAuthor.trim() || (isAdmin ? 'Fasilitator' : 'Peserta'),
          is_facilitator: isAdmin
        });
      }

      setFreeTextContent('');
      setStructuredAnswers({});
      setOtherTextMap({});
      setUploadedFile(null);
      setShowAnswerForm(false);
      setShowAnswers(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - date) / 60000);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow ${
      question.status === 'hidden' ? 'opacity-60 border-rose-200 bg-rose-50/20' : 'border-slate-200'
    }`}>
      <div className="p-4 sm:p-5">
        {/* Header Kartu */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              question.question?.is_anon ? 'bg-slate-100 text-slate-600' : 'bg-sky-100 text-sky-700'
            }`}>
              {question.question?.is_anon ? '?' : (question.question?.author?.charAt(0)?.toUpperCase() || 'P')}
            </div>
            <div>
              <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                {question.question?.is_anon ? 'Peserta Anonim' : (question.question?.author || 'Peserta')}
              </span>
              <span className="text-xs text-slate-400 ml-2">
                {formatTime(question.question?.submitted_at || question.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Format Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              isStructured ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {isStructured ? (
                <>
                  <ClipboardList className="w-3 h-3" />
                  <span>Kuesioner ({fields.length})</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3 h-3" />
                  <span>Teks Bebas</span>
                </>
              )}
            </span>

            {/* Status Answered vs Belum Terjawab */}
            {question.status === 'answered' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Terjawab</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" />
                <span>Belum Terjawab</span>
              </span>
            )}
          </div>
        </div>

        {/* Isi / Judul Pertanyaan */}
        <p className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed whitespace-pre-wrap break-words">
          {question.question?.content}
        </p>

        {/* Baris Upvote & Buka Jawaban */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onUpvote(question._id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
              hasUpvoted
                ? 'bg-sky-500 text-white shadow-sm hover:bg-sky-600 active:scale-95'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-white' : ''}`} />
            <span>{upvoteCount} Upvote</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAnswerForm(!showAnswerForm)}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-xl text-xs transition"
            >
              {showAnswerForm ? 'Batal Menjawab' : '+ Beri Jawaban'}
            </button>

            <button
              type="button"
              onClick={() => setShowAnswers(!showAnswers)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-slate-100 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>{answerCount}</span>
              {showAnswers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Opsi Khusus Admin */}
        {isAdmin && (
          <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-end gap-2 text-xs">
            <button
              onClick={() => onStatusChange(question._id, question.status === 'answered' ? 'open' : 'answered')}
              className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium"
            >
              {question.status === 'answered' ? 'Tandai Open' : 'Tandai Terjawab'}
            </button>
            <button
              onClick={() => onStatusChange(question._id, question.status === 'hidden' ? 'open' : 'hidden')}
              className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 font-medium"
            >
              {question.status === 'hidden' ? 'Tampilkan' : 'Sembunyikan'}
            </button>
            <button
              onClick={() => onDeleteQuestion(question._id)}
              className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-medium"
            >
              Hapus
            </button>
          </div>
        )}
      </div>

      {/* Form Pengisian Jawaban / Kuesioner (Bila tombol + Beri Jawaban diklik) */}
      {showAnswerForm && (
        <div className="bg-sky-50/60 border-t border-sky-100 p-4 sm:p-5 animate-in slide-in-from-top-2">
          <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            {isStructured ? <ClipboardList className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            <span>{isStructured ? 'Formulir Jawaban Kuesioner' : 'Tuliskan Tanggapan Anda'}</span>
          </h4>

          {errorMsg && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            {!isAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Anda (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={answerAuthor}
                  onChange={(e) => setAnswerAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}

            {/* Jika format kuesioner terstruktur */}
            {isStructured ? (
              <div className="space-y-3">
                {fields.map((f, idx) => {
                  const visible = isFieldVisible(f, structuredAnswers);
                  if (!visible) return null;

                  return (
                    <div key={f.field_id || idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                      <label className="block text-xs font-semibold text-slate-800">
                        <span className="text-sky-600 mr-1">#{idx + 1}</span>
                        {f.label}
                        {f.required && <span className="text-rose-500 ml-0.5">*</span>}
                      </label>

                      {f.type === 'short_text' && (
                        <input
                          type="text"
                          value={structuredAnswers[f.field_id] || ''}
                          onChange={(e) => handleFieldAnswerChange(f.field_id, e.target.value)}
                          placeholder="Ketik jawaban..."
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      )}

                      {f.type === 'long_text' && (
                        <textarea
                          rows={2}
                          value={structuredAnswers[f.field_id] || ''}
                          onChange={(e) => handleFieldAnswerChange(f.field_id, e.target.value)}
                          placeholder="Uraikan jawaban..."
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                        />
                      )}

                      {f.type === 'radio' && (() => {
                        let renderOptions = [...(f.options || [])];
                        if (f.allow_other && !renderOptions.some((o) => (o || '').trim().toLowerCase().startsWith('lainnya'))) {
                          renderOptions.push('Lainnya');
                        }

                        return (
                          <div className="space-y-1.5">
                            {renderOptions.map((opt) => {
                              const isOther = (opt || '').trim().toLowerCase().startsWith('lainnya');
                              const currentVal = structuredAnswers[f.field_id];
                              const isSelected = isOther
                                ? typeof currentVal === 'string' && (currentVal === opt || currentVal === 'Lainnya' || currentVal.startsWith('Lainnya:'))
                                : currentVal === opt;

                              if (isOther) {
                                return (
                                  <div
                                    key={opt}
                                    className={`p-2.5 rounded-lg border transition-all text-xs ${
                                      isSelected ? 'border-sky-300 bg-sky-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={f.field_id}
                                        checked={isSelected}
                                        onChange={() => {
                                          const text = otherTextMap[f.field_id] || '';
                                          handleFieldAnswerChange(f.field_id, text.trim() ? `Lainnya: ${text.trim()}` : 'Lainnya');
                                        }}
                                        className="text-sky-600"
                                      />
                                      <span className="font-semibold text-slate-800">{opt}</span>
                                    </label>

                                    {isSelected && (
                                      <div className="mt-2 pl-6 animate-in fade-in duration-150">
                                        <input
                                          type="text"
                                          placeholder="Tuliskan pilihan Anda di sini..."
                                          value={
                                            otherTextMap[f.field_id] !== undefined
                                              ? otherTextMap[f.field_id]
                                              : typeof currentVal === 'string' && currentVal.startsWith('Lainnya: ')
                                              ? currentVal.replace(/^Lainnya:\s*/, '')
                                              : ''
                                          }
                                          onChange={(e) => {
                                            const text = e.target.value;
                                            setOtherTextMap((prev) => ({ ...prev, [f.field_id]: text }));
                                            handleFieldAnswerChange(f.field_id, text.trim() ? `Lainnya: ${text.trim()}` : 'Lainnya');
                                          }}
                                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs placeholder:text-slate-400"
                                          autoFocus
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <label key={opt} className="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer hover:bg-slate-50">
                                  <input
                                    type="radio"
                                    name={f.field_id}
                                    checked={isSelected}
                                    onChange={() => {
                                      handleFieldAnswerChange(f.field_id, opt);
                                      setOtherTextMap((prev) => ({ ...prev, [f.field_id]: '' }));
                                    }}
                                    className="text-sky-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {f.type === 'checkbox' && (() => {
                        let renderOptions = [...(f.options || [])];
                        if (f.allow_other && !renderOptions.some((o) => (o || '').trim().toLowerCase().startsWith('lainnya'))) {
                          renderOptions.push('Lainnya');
                        }

                        const currentArr = Array.isArray(structuredAnswers[f.field_id]) ? structuredAnswers[f.field_id] : [];

                        return (
                          <div className="space-y-1.5">
                            {renderOptions.map((opt) => {
                              const isOther = (opt || '').trim().toLowerCase().startsWith('lainnya');
                              const isChecked = isOther
                                ? currentArr.some((x) => x === opt || x === 'Lainnya' || x.startsWith('Lainnya:'))
                                : currentArr.includes(opt);

                              if (isOther) {
                                return (
                                  <div
                                    key={opt}
                                    className={`p-2.5 rounded-lg border transition-all text-xs ${
                                      isChecked ? 'border-sky-300 bg-sky-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            const next = currentArr.filter((x) => !x.startsWith('Lainnya') && x !== opt);
                                            handleFieldAnswerChange(f.field_id, next);
                                          } else {
                                            const text = otherTextMap[f.field_id] || '';
                                            const otherVal = text.trim() ? `Lainnya: ${text.trim()}` : 'Lainnya';
                                            handleFieldAnswerChange(f.field_id, [...currentArr, otherVal]);
                                          }
                                        }}
                                        className="text-sky-600 rounded"
                                      />
                                      <span className="font-semibold text-slate-800">{opt}</span>
                                    </label>

                                    {isChecked && (
                                      <div className="mt-2 pl-6 animate-in fade-in duration-150">
                                        <input
                                          type="text"
                                          placeholder="Tuliskan pilihan Anda di sini..."
                                          value={otherTextMap[f.field_id] || ''}
                                          onChange={(e) => {
                                            const text = e.target.value;
                                            setOtherTextMap((prev) => ({ ...prev, [f.field_id]: text }));
                                            const otherVal = text.trim() ? `Lainnya: ${text.trim()}` : 'Lainnya';
                                            const filtered = currentArr.filter((x) => !x.startsWith('Lainnya') && x !== opt);
                                            handleFieldAnswerChange(f.field_id, [...filtered, otherVal]);
                                          }}
                                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs placeholder:text-slate-400"
                                          autoFocus
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <label key={opt} className="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleCheckboxToggle(f.field_id, opt)}
                                    className="text-sky-600 rounded"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {f.type === 'file' && (
                        <FileUploadField
                          field={f}
                          file={uploadedFile}
                          cloudLink={typeof structuredAnswers[f.field_id] === 'string' && structuredAnswers[f.field_id].startsWith('http') ? structuredAnswers[f.field_id] : ''}
                          onFileChange={(file) => {
                            setUploadedFile(file);
                            handleFieldAnswerChange(f.field_id, file ? file.name : '');
                          }}
                          onCloudLinkChange={(url) => {
                            setUploadedFile(null);
                            handleFieldAnswerChange(f.field_id, url);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggapan / Jawaban:</label>
                <textarea
                  required
                  rows={3}
                  value={freeTextContent}
                  onChange={(e) => setFreeTextContent(e.target.value)}
                  placeholder="Ketik tanggapan Anda di sini..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAnswerForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 font-semibold rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingAnswer}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingAnswer ? 'Mengirim...' : 'Kirim Jawaban'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bagian Daftar Jawaban Thread (Expandable) */}
      {showAnswers && (
        <div className="bg-slate-50/80 rounded-b-2xl border-t border-slate-100 p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Jawaban yang Masuk ({answers.length})
          </h4>

          {answers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Belum ada tanggapan. Jadilah yang pertama menjawab!
            </p>
          ) : (
            <div className="space-y-3">
              {answers.map((ans, idx) => (
                <div
                  key={ans.answer_id || idx}
                  className={`p-3.5 rounded-xl text-xs space-y-2 border ${
                    ans.is_facilitator ? 'bg-sky-50/70 border-sky-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span>{ans.answered_by}</span>
                      {ans.is_facilitator && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-sky-600 text-white font-semibold">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Fasilitator</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(ans.answered_at)}
                    </span>
                  </div>

                  {/* Jika jawaban berstruktur kuesioner */}
                  {ans.structured_answers && ans.structured_answers.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {ans.structured_answers.map((sa, sIdx) => {
                        const fieldDef = fields.find((f) => f.field_id === sa.field_id);
                        return (
                          <div key={sIdx} className="p-2 bg-slate-50 rounded border border-slate-100">
                            <span className="font-semibold text-slate-600 block text-[11px]">
                              {fieldDef?.label || sa.field_id}:
                            </span>
                            {sa.file_info ? (
                              sa.file_info.is_cloud_link ? (
                                <a
                                  href={sa.file_info.url || sa.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 font-bold underline mt-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Buka Tautan Online (Drive/Cloud) ↗</span>
                                </a>
                              ) : (
                                <span className="font-bold text-sky-700 flex items-center gap-1 mt-0.5">
                                  📎 {sa.file_info.originalname}
                                </span>
                              )
                            ) : typeof sa.value === 'string' && (sa.value.startsWith('http://') || sa.value.startsWith('https://')) ? (
                              <a
                                href={sa.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 font-bold underline mt-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Buka Tautan Online ↗</span>
                              </a>
                            ) : (
                              <span className="text-slate-800 font-medium">
                                {Array.isArray(sa.value) ? sa.value.join(', ') : (sa.value || '-')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{ans.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
