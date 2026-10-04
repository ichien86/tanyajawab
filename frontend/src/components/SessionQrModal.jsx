import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, QrCode, ExternalLink } from 'lucide-react';

export default function SessionQrModal({ isOpen, onClose, session }) {
  const [copied, setCopied] = React.useState(false);
  const svgRef = useRef(null);

  if (!isOpen || !session) return null;

  // Bangun URL sesi peserta
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://tanyajawab-app.fly.dev';
  const sessionUrl = `${host}/?s=${session.session_code || session.session_id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    const svgElement = svgRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 40, 40, 520, 520);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QRCode_Sesi_${session.session_code || 'TanyaJawab'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 text-center">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <QrCode className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-sm">QR Code Sesi Peserta</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 text-base leading-snug">
              {session.title}
            </h4>
            <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono text-xs font-bold">
              Kode Sesi: {session.session_code || session.session_id}
            </div>
          </div>

          {/* QR Code Container */}
          <div
            ref={svgRef}
            className="bg-white p-4 rounded-2xl border-2 border-dashed border-sky-200 inline-block shadow-sm"
          >
            <QRCodeSVG
              value={sessionUrl}
              size={200}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: '/favicon.ico',
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true
              }}
            />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Arahkan kamera smartphone peserta ke QR Code di atas untuk langsung membuka dan bergabung ke forum tanya jawab sesi ini.
          </p>

          {/* Tautan URL & Tombol Salin */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-left">
            <input
              type="text"
              readOnly
              value={sessionUrl}
              className="flex-1 bg-transparent text-xs text-slate-600 font-mono focus:outline-none truncate px-1"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <a
            href={sessionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-sky-600 flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Tautan</span>
          </a>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Gambar QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
