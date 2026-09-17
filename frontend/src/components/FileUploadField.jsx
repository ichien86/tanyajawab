import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, File, CheckCircle, X, Loader2, Link2, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

export default function FileUploadField({
  field,
  file,
  onFileChange,
  cloudLink = '',
  onCloudLinkChange
}) {
  const [mode, setMode] = useState(cloudLink ? 'link' : 'file');
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState('');
  const [sizeWarning, setSizeWarning] = useState(null);
  const fileInputRef = useRef(null);
  const linkInputRef = useRef(null);

  // Sinkronkan mode jika cloudLink terisi dari luar
  useEffect(() => {
    if (cloudLink && !file) {
      setMode('link');
    }
  }, [cloudLink, file]);

  const handleSelectFile = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setSizeWarning(null);

    // Cek ekstensi yang diizinkan
    const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      alert('Format berkas tidak didukung! Hanya PDF, JPG, dan PNG yang diperbolehkan.');
      e.target.value = '';
      return;
    }

    // Kompresi di sisi klien jika bertipe gambar
    if (selected.type.startsWith('image/')) {
      setCompressing(true);
      setCompressionInfo('Mengompresi gambar di perangkat...');
      try {
        const compressed = await compressImage(selected, 500);
        if (compressed.size > 2 * 1024 * 1024) {
          const sizeMB = (compressed.size / (1024 * 1024)).toFixed(1);
          setSizeWarning(`Ukuran foto (${sizeMB} MB) melebihi batas 2 MB setelah kompresi. Anda disarankan membagikan tautan dari Google Drive atau Cloud Storage.`);
          onFileChange(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          setCompressionInfo(`Ukuran dioptimasi: ${(selected.size / 1024).toFixed(0)} KB ➔ ${(compressed.size / 1024).toFixed(0)} KB`);
          onFileChange(compressed);
          if (onCloudLinkChange) onCloudLinkChange('');
        }
      } catch (err) {
        console.error('Gagal kompresi:', err);
        if (selected.size > 2 * 1024 * 1024) {
          const sizeMB = (selected.size / (1024 * 1024)).toFixed(1);
          setSizeWarning(`Ukuran berkas (${sizeMB} MB) melebihi batas 2 MB. Silakan gunakan tautan Google Drive / Cloud.`);
          onFileChange(null);
        } else {
          onFileChange(selected);
          if (onCloudLinkChange) onCloudLinkChange('');
        }
      } finally {
        setCompressing(false);
      }
    } else {
      // Dokumen PDF: cek batas 2 MB
      if (selected.size > 2 * 1024 * 1024) {
        const sizeMB = (selected.size / (1024 * 1024)).toFixed(1);
        setSizeWarning(`Dokumen PDF (${sizeMB} MB) melebihi batas maksimum 2 MB. Anda dapat membagikan tautan berkas dari Google Drive.`);
        onFileChange(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setCompressionInfo(`Dokumen PDF (${(selected.size / 1024).toFixed(0)} KB)`);
      onFileChange(selected);
      if (onCloudLinkChange) onCloudLinkChange('');
    }
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    setCompressionInfo('');
    setSizeWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSwitchToLink = () => {
    setMode('link');
    setSizeWarning(null);
    if (onFileChange) onFileChange(null);
    setTimeout(() => {
      if (linkInputRef.current) {
        linkInputRef.current.focus();
      }
    }, 100);
  };

  const isCloudLinkValid = typeof cloudLink === 'string' && (cloudLink.trim().startsWith('http://') || cloudLink.trim().startsWith('https://'));

  return (
    <div className="space-y-2.5">
      {/* Tab Switcher: Berkas Langsung vs Tautan Cloud */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setMode('file');
            if (onCloudLinkChange) onCloudLinkChange('');
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mode === 'file'
              ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Unggah Berkas</span>
          <span className="text-[10px] opacity-70 font-normal">(&le; 2 MB)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('link');
            if (onFileChange) onFileChange(null);
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mode === 'link'
              ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Tautan Cloud / Drive</span>
          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded">Bebas</span>
        </button>
      </div>

      {/* Mode 1: Unggah Berkas Langsung */}
      {mode === 'file' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/jpg"
            onChange={handleSelectFile}
            className="hidden"
            id={`file_input_${field.field_id}`}
          />

          {!file ? (
            <div>
              <label
                htmlFor={`file_input_${field.field_id}`}
                className={`border-2 border-dashed border-slate-200 hover:border-sky-500 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50/60 hover:bg-sky-50/40 transition text-center ${
                  compressing ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {compressing ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                    <p className="text-xs font-semibold text-sky-700">{compressionInfo}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-2">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      {field.upload_text || field.label || 'Pilih Berkas atau Ambil Foto'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      PDF, JPG, atau PNG (Maksimal 2 MB)
                    </span>
                    <span className="mt-2 text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      Otomatis dikompresi & diverifikasi
                    </span>
                  </>
                )}
              </label>

              {/* Banner Peringatan jika File > 2 MB dengan tombol switch 1-klik */}
              {sizeWarning && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-800 leading-snug">{sizeWarning}</p>
                    <button
                      type="button"
                      onClick={handleSwitchToLink}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Beralih ke Tautan Cloud / Drive &rarr;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                  <File className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>{compressionInfo || `${(file.size / 1024).toFixed(0)} KB Siap diunggah`}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition flex-shrink-0"
                title="Hapus berkas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Tautan Cloud / Drive (Google Drive, Dropbox, OneDrive, dll.) */}
      {mode === 'link' && (
        <div className="space-y-2.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              {field.upload_text ? `Tautan Cloud (${field.upload_text}):` : (field.label ? `Tautan Cloud untuk "${field.label}":` : 'Tautan Penyimpanan Cloud (Google Drive / OneDrive / dsb):')}
            </label>
            <div className="relative">
              <input
                ref={linkInputRef}
                type="url"
                value={cloudLink}
                onChange={(e) => onCloudLinkChange && onCloudLinkChange(e.target.value)}
                placeholder="https://drive.google.com/... atau tautan penyimpanan online Anda"
                className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              {cloudLink && (
                <button
                  type="button"
                  onClick={() => onCloudLinkChange && onCloudLinkChange('')}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Hapus tautan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Helper Tips & Akses */}
          <div className="p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl text-[11px] text-sky-800 space-y-1">
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Tips Berkas Besar (&gt; 2 MB):</strong> Unggah berkas ke Google Drive atau OneDrive, lalu pastikan izin akses tautan disetel ke <em>"Siapa saja yang memiliki tautan dapat melihat"</em>.
              </p>
            </div>
          </div>

          {/* Pratinjau Tautan */}
          {isCloudLinkValid && (
            <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold truncate">Tautan valid siap dikirim</span>
              </div>
              <a
                href={cloudLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 flex-shrink-0 shadow-sm transition"
              >
                <span>Uji Tautan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
