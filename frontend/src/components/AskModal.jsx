import React, { useState } from 'react';
import { X, Send, EyeOff, User, Plus, Trash2, GitFork, MessageSquare, ClipboardList, RotateCcw } from 'lucide-react';

const createDefaultFields = () => [
  {
    field_id: 'f_1',
    type: 'radio',
    label: 'Pilih salah satu opsi:',
    upload_text: '',
    options: ['Opsi Ya', 'Opsi Tidak'],
    required: true,
    logic: null
  }
];

export default function AskModal({ isOpen, onClose, onSubmit }) {
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [isAnon, setIsAnon] = useState(true);
  const [responseType, setResponseType] = useState('free_text'); // 'free_text' | 'structured'
  const [fields, setFields] = useState(createDefaultFields());
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setContent('');
    setAuthor('');
    setIsAnon(true);
    setResponseType('free_text');
    setFields(createDefaultFields());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const getDefaultLogicForParent = (parent) => {
    if (!parent) return null;
    const cleanOpts = (parent.options || []).map((o) => String(o).trim()).filter(Boolean);
    const firstOpt = cleanOpts[0] || (parent.options?.[0] || '');

    if (parent.type === 'radio') {
      return {
        parent_id: parent.field_id,
        operator: 'equals',
        trigger_value: firstOpt,
        action: 'show'
      };
    }
    if (parent.type === 'checkbox') {
      return {
        parent_id: parent.field_id,
        operator: 'contains',
        trigger_value: firstOpt,
        action: 'show'
      };
    }
    if (parent.type === 'file') {
      return {
        parent_id: parent.field_id,
        operator: 'filled',
        trigger_value: '',
        action: 'show'
      };
    }
    // short_text atau long_text
    return {
      parent_id: parent.field_id,
      operator: 'filled',
      trigger_value: '',
      action: 'show'
    };
  };

  const handleAddField = () => {
    const newId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newField = {
      field_id: newId,
      type: 'short_text',
      label: `Pertanyaan #${fields.length + 1}`,
      options: ['Pilihan 1', 'Pilihan 2'],
      required: false,
      logic: null
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (idx) => {
    setFields((prev) => {
      const removedId = prev[idx]?.field_id;
      return prev
        .filter((_, i) => i !== idx)
        .map((f) => {
          if (f.logic && f.logic.parent_id === removedId) {
            return { ...f, logic: null };
          }
          return f;
        });
    });
  };

  const handleUpdateField = (idx, updates) => {
    setFields((prev) => {
      const updated = [...prev];
      const oldField = updated[idx];
      const newField = { ...oldField, ...updates };
      updated[idx] = newField;

      // Jika field ini dijadikan parent oleh pertanyaan di bawahnya, sinkronkan otomatis
      const updatedFieldId = newField.field_id;
      const cleanOpts = (newField.options || []).map((o) => String(o).trim()).filter(Boolean);

      for (let i = idx + 1; i < updated.length; i++) {
        const child = updated[i];
        if (child.logic && child.logic.parent_id === updatedFieldId) {
          // Jika tipe induk berubah, sesuaikan aturan kondisionalnya
          if (oldField.type !== newField.type) {
            updated[i] = {
              ...child,
              logic: getDefaultLogicForParent(newField)
            };
          } else if (newField.type === 'radio' || newField.type === 'checkbox') {
            // Jika options induk berubah dan trigger saat ini tidak ada di daftar baru, sesuaikan ke opsi pertama
            if (cleanOpts.length > 0 && !cleanOpts.includes(child.logic.trigger_value)) {
              if (child.logic.operator === 'equals' || child.logic.operator === 'not_equals' || child.logic.operator === 'contains') {
                updated[i] = {
                  ...child,
                  logic: {
                    ...child.logic,
                    trigger_value: cleanOpts[0]
                  }
                };
              }
            }
          }
        }
      }

      return updated;
    });
  };

  const handleAddOption = (fieldIdx) => {
    const f = fields[fieldIdx];
    const opts = f.options || [];
    handleUpdateField(fieldIdx, { options: [...opts, `Pilihan ${opts.length + 1}`] });
  };

  const handleUpdateOption = (fieldIdx, optIdx, val) => {
    const f = fields[fieldIdx];
    const opts = [...(f.options || [])];
    opts[optIdx] = val;
    handleUpdateField(fieldIdx, { options: opts });
  };

  const handleRemoveOption = (fieldIdx, optIdx) => {
    const f = fields[fieldIdx];
    const opts = (f.options || []).filter((_, i) => i !== optIdx);
    handleUpdateField(fieldIdx, { options: opts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let targetContent = content.trim();
    if (responseType === 'structured') {
      if (!targetContent) {
        // Fallback ke label pertanyaan kuesioner pertama yang terisi
        const firstWithLabel = fields.find((f) => f && f.label && f.label.trim());
        if (firstWithLabel) {
          targetContent = firstWithLabel.label.trim();
        } else {
          targetContent = 'Kuesioner Diskusi';
        }
      }

      if (!fields || fields.length === 0) {
        alert('Harap tambahkan setidaknya satu pertanyaan kuesioner.');
        return;
      }

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (f.type === 'radio' || f.type === 'checkbox') {
          const validOpts = (f.options || []).map((o) => String(o).trim()).filter(Boolean);
          if (validOpts.length === 0) {
            alert(`Pertanyaan #${i + 1} (${f.type === 'radio' ? 'Pilihan Ganda' : 'Checkbox'}) harus memiliki setidaknya satu opsi pilihan.`);
            return;
          }
        }
      }
    } else {
      if (!targetContent) {
        alert('Harap tuliskan pertanyaan Anda.');
        return;
      }
    }

    setLoading(true);
    try {
      // Pastikan validitas seluruh logika kondisional sebelum submit
      const sanitizedFields = responseType === 'structured' ? fields.map((f, fIdx) => {
        const cleanLabel = (f.label && f.label.trim()) || `Pertanyaan #${fIdx + 1}`;
        const cleanOpts = Array.isArray(f.options)
          ? f.options.map((o) => String(o).trim()).filter(Boolean)
          : [];
        const cleanUploadText = (f.upload_text || '').trim();

        let cleanLogic = null;
        if (f.logic && f.logic.parent_id) {
          const parent = fields.slice(0, fIdx).find((p) => p.field_id === f.logic.parent_id);
          if (parent) {
            cleanLogic = { ...f.logic };
            if (parent.type === 'radio' || parent.type === 'checkbox') {
              const parentValidOpts = (parent.options || []).map((o) => String(o).trim()).filter(Boolean);
              if (f.logic.operator === 'equals' || f.logic.operator === 'not_equals' || f.logic.operator === 'contains') {
                cleanLogic.trigger_value = parentValidOpts.includes(f.logic.trigger_value)
                  ? f.logic.trigger_value
                  : (parentValidOpts[0] || '');
              }
            }
          }
        }

        return {
          field_id: f.field_id,
          type: f.type,
          label: cleanLabel,
          upload_text: cleanUploadText,
          options: cleanOpts,
          required: Boolean(f.required),
          logic: cleanLogic
        };
      }) : [];

      await onSubmit({
        content: targetContent,
        author: isAnon ? null : (author.trim() || 'Peserta'),
        is_anon: isAnon,
        response_type: responseType,
        fields: sanitizedFields
      });
      resetForm();
      onClose();
    } catch (err) {
      alert('Gagal mengirim pertanyaan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Ajukan Pertanyaan Baru</h3>
            <p className="text-[11px] text-slate-400">Isi formulir untuk memulai diskusi atau survei</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition"
              title="Bersihkan seluruh isi formulir (Reset)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Tutup formulir"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Pilihan Format Pertanyaan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Jenis Format Pertanyaan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResponseType('free_text')}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  responseType === 'free_text'
                    ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Teks Bebas Biasa</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">Penjawab merespons dengan teks narasi</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResponseType('structured')}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  responseType === 'structured'
                    ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Format Kuesioner</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">Bisa pilih radio, ceklis, upload, & kondisional</span>
                </div>
              </button>
            </div>
          </div>

          {/* Isi Pertanyaan Utama */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {responseType === 'structured' ? 'Judul / Topik Pertanyaan Kuesioner (Opsional)' : 'Pertanyaan Anda'}
            </label>
            <textarea
              required={responseType === 'free_text'}
              rows={responseType === 'structured' ? 2 : 3}
              placeholder={responseType === 'structured' ? 'Contoh: Identifikasi Kesiapan Posko Bantuan (opsional, otomatis menggunakan pertanyaan di bawah jika kosong)' : 'Tulis pertanyaan Anda di sini...'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
            />
          </div>

          {/* Builder Pertanyaan Kuesioner & Kondisional jika responseType === 'structured' */}
          {responseType === 'structured' && (
            <div className="space-y-3 bg-sky-50/40 p-3.5 sm:p-4 rounded-2xl border border-sky-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                  Pengaturan Jenis Jawaban Yang Diinginkan
                </span>
                <span className="text-[11px] text-sky-600 font-semibold">{fields.length} Pertanyaan</span>
              </div>

              {fields.map((f, fIdx) => {
                const eligibleParents = fields.slice(0, fIdx);

                return (
                  <div key={f.field_id || fIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">
                        Pertanyaan #{fIdx + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(fIdx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Label & Tipe Input */}
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Isi Pertanyaan / Label:</label>
                        <input
                          type="text"
                          value={f.label}
                          placeholder={`Pertanyaan #${fIdx + 1} (contoh: ${f.type === 'radio' ? 'Pilih salah satu opsi' : f.type === 'checkbox' ? 'Pilih opsi yang sesuai' : f.type === 'file' ? 'Unggah dokumen bukti' : 'Tulis pertanyaan di sini'}...)`}
                          onFocus={(e) => {
                            const v = (e.target.value || '').trim();
                            if (!v || v === 'Pilih salah satu opsi:' || /^Pertanyaan\s*#\d+$/i.test(v)) {
                              handleUpdateField(fIdx, { label: '' });
                            }
                          }}
                          onChange={(e) => handleUpdateField(fIdx, { label: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tipe Jawaban:</label>
                          <select
                            value={f.type}
                            onChange={(e) => handleUpdateField(fIdx, { type: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="radio">Pilihan Ganda (Radio)</option>
                            <option value="checkbox">Kotak Ceklis (Checkbox)</option>
                            <option value="short_text">Teks Singkat</option>
                            <option value="long_text">Teks Panjang / Uraian</option>
                            <option value="file">Unggah Berkas / Foto Bukti</option>
                          </select>
                        </div>

                        <div className="flex items-end pb-1.5">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-medium">
                            <input
                              type="checkbox"
                              checked={f.required}
                              onChange={(e) => handleUpdateField(fIdx, { required: e.target.checked })}
                              className="rounded text-sky-600"
                            />
                            <span>Wajib Dijawab</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Pengaturan Kustom Teks / Label Kotak Unggah Berkas */}
                    {f.type === 'file' && (
                      <div className="bg-sky-50/70 p-2.5 rounded-lg border border-sky-200/80 space-y-1.5">
                        <label className="block text-[11px] font-semibold text-sky-900">
                          Teks Label Pada Kotak Unggah (Dropzone Label):
                        </label>
                        <input
                          type="text"
                          placeholder={`Contoh: Pilih atau Ambil Foto ${f.label || 'Dokumen'}`}
                          value={f.upload_text || ''}
                          onChange={(e) => handleUpdateField(fIdx, { upload_text: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <span className="text-[10px] text-slate-500 block leading-tight">
                          Label teks yang akan muncul di tombol/area upload responden (default: <em>"{f.label || 'Pilih Berkas atau Ambil Foto'}"</em>).
                        </span>
                      </div>
                    )}

                    {/* Opsi Pilihan untuk Radio / Checkbox */}
                    {(f.type === 'radio' || f.type === 'checkbox') && (
                      <div className="bg-slate-50 p-2.5 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600">Pilihan Opsi:</span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(fIdx)}
                            className="text-[11px] text-sky-600 font-semibold hover:text-sky-800 flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Tambah Opsi
                          </button>
                        </div>
                        {(f.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={opt}
                              placeholder={`Pilihan ${oIdx + 1}`}
                              onFocus={(e) => {
                                const v = (e.target.value || '').trim();
                                if (['Opsi Ya', 'Opsi Tidak'].includes(v) || /^Pilihan\s*\d+$/i.test(v)) {
                                  handleUpdateOption(fIdx, oIdx, '');
                                }
                              }}
                              onChange={(e) => handleUpdateOption(fIdx, oIdx, e.target.value)}
                              className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(fIdx, oIdx)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pengaturan Kondisional Bertingkat */}
                    {eligibleParents.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(f.logic)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleUpdateField(fIdx, {
                                    logic: getDefaultLogicForParent(eligibleParents[0])
                                  });
                                } else {
                                  handleUpdateField(fIdx, { logic: null });
                                }
                              }}
                              className="rounded text-amber-600"
                            />
                            <GitFork className="w-3.5 h-3.5" />
                            <span>Munculkan Berdasarkan Jawaban Sebelumnya (Kondisional)</span>
                          </label>
                        </div>

                        {f.logic && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2.5">
                            {/* Baris 1: Pertanyaan Induk yang Menjadi Syarat */}
                            <div>
                              <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                Jika Pertanyaan:
                              </span>
                              <select
                                value={f.logic.parent_id}
                                onChange={(e) => {
                                  const newParentId = e.target.value;
                                  const newParent = eligibleParents.find((p) => p.field_id === newParentId);
                                  handleUpdateField(fIdx, {
                                    logic: getDefaultLogicForParent(newParent)
                                  });
                                }}
                                className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                {eligibleParents.map((p, pIdx) => {
                                  const optCount = (p.options || []).filter((o) => o && String(o).trim()).length;
                                  const typeLabel = p.type === 'radio'
                                    ? `Pilihan Ganda (${optCount} opsi)`
                                    : p.type === 'checkbox'
                                    ? `Ceklis (${optCount} opsi)`
                                    : p.type === 'file'
                                    ? 'Unggah Berkas'
                                    : 'Teks';
                                  const parentText = (p.label || '').trim() || `Pertanyaan #${pIdx + 1}`;
                                  return (
                                    <option key={p.field_id} value={p.field_id}>
                                      #{pIdx + 1} [{typeLabel}]: {parentText.substring(0, 35)}...
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Baris 2: Kondisi Pemicu Sesuai Tipe Pertanyaan Induk */}
                            {(() => {
                              const activeParent = eligibleParents.find((p) => p.field_id === f.logic.parent_id) || eligibleParents[0];
                              const parentIndex = eligibleParents.findIndex((p) => p.field_id === f.logic.parent_id);
                              const pType = activeParent?.type;

                              // A. Tipe Teks Singkat / Teks Panjang
                              if (pType === 'short_text' || pType === 'long_text') {
                                return (
                                  <div className="space-y-2 pt-1 border-t border-amber-200/60">
                                    <div>
                                      <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                        Kondisi Pemicu Jawaban Teks:
                                      </span>
                                      <select
                                        value={f.logic.operator || 'filled'}
                                        onChange={(e) => handleUpdateField(fIdx, { logic: { ...f.logic, operator: e.target.value } })}
                                        className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      >
                                        <option value="filled">✅ Jawaban SUDAH TERISI (tidak kosong)</option>
                                        <option value="empty">⭕ Jawaban BELUM TERISI (masih kosong)</option>
                                        <option value="contains">🔍 Teks jawaban MENGANDUNG kata tertentu...</option>
                                        <option value="equals">🎯 Teks jawaban SAMA PERSIS dengan kata...</option>
                                      </select>
                                    </div>

                                    {(f.logic.operator === 'contains' || f.logic.operator === 'equals') && (
                                      <div>
                                        <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                          Kata Kunci Teks Pemicu:
                                        </span>
                                        <input
                                          type="text"
                                          required
                                          value={f.logic.trigger_value || ''}
                                          onChange={(e) => handleUpdateField(fIdx, { logic: { ...f.logic, trigger_value: e.target.value } })}
                                          placeholder="Contoh: Butuh Bantuan, Mendesak, dll."
                                          className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // B. Tipe Unggah Berkas / Foto
                              if (pType === 'file') {
                                return (
                                  <div className="pt-1 border-t border-amber-200/60">
                                    <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                      Kondisi Pemicu Berkas:
                                    </span>
                                    <select
                                      value={f.logic.operator || 'filled'}
                                      onChange={(e) => handleUpdateField(fIdx, { logic: { ...f.logic, operator: e.target.value, trigger_value: '' } })}
                                      className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      <option value="filled">📎 Berkas / foto bukti SUDAH diunggah</option>
                                      <option value="empty">⭕ Berkas / foto bukti BELUM diunggah</option>
                                    </select>
                                  </div>
                                );
                              }

                              // C. Tipe Radio (Pilihan Ganda)
                              if (pType === 'radio') {
                                const validOptions = (activeParent?.options || [])
                                  .map((o) => String(o).trim())
                                  .filter(Boolean);
                                const currentTrigger = validOptions.includes(f.logic.trigger_value)
                                  ? f.logic.trigger_value
                                  : (validOptions[0] || '');

                                return (
                                  <div className="space-y-2 pt-1 border-t border-amber-200/60">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                          Kondisi Pilihan:
                                        </span>
                                        <select
                                          value={f.logic.operator || 'equals'}
                                          onChange={(e) => handleUpdateField(fIdx, { 
                                            logic: { 
                                              ...f.logic, 
                                              operator: e.target.value,
                                              trigger_value: (e.target.value === 'equals' || e.target.value === 'not_equals') ? currentTrigger : ''
                                            } 
                                          })}
                                          className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="equals">🎯 Memilih opsi sama dengan</option>
                                          <option value="not_equals">🚫 Memilih opsi BUKAN</option>
                                          <option value="filled">✅ Sudah memilih salah satu opsi</option>
                                          <option value="empty">⭕ Belum memilih opsi apapun</option>
                                        </select>
                                      </div>

                                      {(f.logic.operator === 'equals' || f.logic.operator === 'not_equals') && (
                                        <div>
                                          <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                            Pilihan Pemicu (Dari Pilihan Ganda):
                                          </span>
                                          {validOptions.length > 0 ? (
                                            <select
                                              value={currentTrigger}
                                              onChange={(e) => handleUpdateField(fIdx, { logic: { ...f.logic, trigger_value: e.target.value } })}
                                              className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                            >
                                              {validOptions.map((opt, oIdx) => (
                                                <option key={oIdx} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <div className="p-1.5 bg-amber-100/80 border border-amber-300 rounded-lg text-[11px] text-amber-900 leading-tight">
                                              Pertanyaan #{parentIndex + 1} belum memiliki opsi pilihan.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {validOptions.length > 0 && (
                                      <p className="text-[10.5px] text-amber-800 font-medium">
                                        💡 Opsi pemicu bersumber otomatis dari pilihan ganda pertanyaan #{parentIndex + 1} di atas.
                                      </p>
                                    )}
                                  </div>
                                );
                              }

                              // D. Tipe Checkbox (Kotak Ceklis)
                              if (pType === 'checkbox') {
                                const validOptions = (activeParent?.options || [])
                                  .map((o) => String(o).trim())
                                  .filter(Boolean);
                                const currentTrigger = validOptions.includes(f.logic.trigger_value)
                                  ? f.logic.trigger_value
                                  : (validOptions[0] || '');

                                return (
                                  <div className="space-y-2 pt-1 border-t border-amber-200/60">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                          Kondisi Ceklis:
                                        </span>
                                        <select
                                          value={f.logic.operator || 'contains'}
                                          onChange={(e) => handleUpdateField(fIdx, { 
                                            logic: { 
                                              ...f.logic, 
                                              operator: e.target.value,
                                              trigger_value: e.target.value === 'contains' ? currentTrigger : ''
                                            } 
                                          })}
                                          className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="contains">☑️ Mencentang opsi tertentu</option>
                                          <option value="filled">✅ Sudah mencentang setidaknya 1 opsi</option>
                                          <option value="empty">⭕ Belum mencentang opsi apapun</option>
                                        </select>
                                      </div>

                                      {f.logic.operator === 'contains' && (
                                        <div>
                                          <span className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                                            Pilihan yang Dicentang:
                                          </span>
                                          {validOptions.length > 0 ? (
                                            <select
                                              value={currentTrigger}
                                              onChange={(e) => handleUpdateField(fIdx, { logic: { ...f.logic, trigger_value: e.target.value } })}
                                              className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                            >
                                              {validOptions.map((opt, oIdx) => (
                                                <option key={oIdx} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <div className="p-1.5 bg-amber-100/80 border border-amber-300 rounded-lg text-[11px] text-amber-900 leading-tight">
                                              Pertanyaan #{parentIndex + 1} belum memiliki opsi centang.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {validOptions.length > 0 && (
                                      <p className="text-[10.5px] text-amber-800 font-medium">
                                        💡 Opsi pemicu bersumber otomatis dari kotak centang pertanyaan #{parentIndex + 1} di atas.
                                      </p>
                                    )}
                                  </div>
                                );
                              }

                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddField}
                className="w-full py-2 bg-white border border-dashed border-sky-300 hover:border-sky-500 rounded-xl text-xs font-semibold text-sky-700 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Pertanyaan Lanjutan (Kondisional)</span>
              </button>
            </div>
          )}

          {/* Opsi Kirim sebagai Anonim */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-semibold text-slate-800">Kirim sebagai Anonim</span>
              </div>
              <input
                type="checkbox"
                checked={isAnon}
                onChange={(e) => setIsAnon(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600"
              />
            </label>

            {!isAnon && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  required={!isAnon}
                  placeholder="Nama Anda / Instansi"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || (responseType === 'free_text' && !content.trim())}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Mengirim...' : 'Kirim Pertanyaan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
