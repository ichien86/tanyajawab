const assert = require('assert');
const { EventEmitter } = require('events');
const { app } = require('../server');
const { initDatabase } = require('../config/database');
const { runSeed } = require('../seeds/seed');

function invoke(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.path = url.split('?')[0];
    req.query = {};
    if (url.includes('?')) {
      const qs = url.split('?')[1];
      new URLSearchParams(qs).forEach((v, k) => { req.query[k] = v; });
    }
    req.headers = {
      'content-type': 'application/json',
      ...headers
    };
    req.body = body || {};
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = { remoteAddress: '127.0.0.1' };

    const resHeaders = {};
    const res = {
      statusCode: 200,
      setHeader: (k, v) => { resHeaders[k.toLowerCase()] = v; },
      getHeader: (k) => resHeaders[k.toLowerCase()],
      status: function (code) { this.statusCode = code; return this; },
      json: function (obj) {
        this.body = obj;
        resolve({ statusCode: this.statusCode, headers: resHeaders, body: obj });
      },
      send: function (data) {
        this.body = data;
        resolve({ statusCode: this.statusCode, headers: resHeaders, body: data });
      },
      sendFile: function (filePath) {
        resolve({ statusCode: this.statusCode, headers: resHeaders, filePath });
      }
    };

    app(req, res);
  });
}

async function run() {
  console.log('🧪 Memulai Pengujian In-Process API & Alur Bisnis Tanya Jawab...\n');
  await initDatabase();
  await runSeed();

  // 1. Health check
  console.log('1. Menguji GET /api/health');
  const h = await invoke('GET', '/api/health');
  assert.strictEqual(h.statusCode, 200);
  assert.strictEqual(h.body.status, 'ok');
  console.log('   ✅ Health check OK');

  // 2. Session
  console.log('2. Menguji GET /api/admin/session?session_id=default_session');
  const s = await invoke('GET', '/api/admin/session?session_id=default_session');
  assert.strictEqual(s.statusCode, 200);
  assert.strictEqual(s.body.success, true);
  console.log('   ✅ Sesi berhasil ditemukan:', s.body.data.title);

  // 3. Buat Pertanyaan Berstruktur Kuesioner dengan Logika Kondisional
  console.log('3. Menguji POST /api/qna/questions (Format Kuesioner Dinamis)');
  const q = await invoke('POST', '/api/qna/questions', {
    session_id: 'default_session',
    content: 'Apakah wilayah Anda membutuhkan dapur umum darurat?',
    author: 'Koordinator Posko',
    is_anon: false,
    response_type: 'structured',
    fields: [
      {
        field_id: 'f1_butuh',
        type: 'radio',
        label: 'Apakah butuh dapur umum?',
        options: ['Ya', 'Tidak'],
        required: true
      },
      {
        field_id: 'f2_porsi',
        type: 'short_text',
        label: 'Perkiraan jumlah porsi per hari:',
        required: true,
        logic: {
          parent_id: 'f1_butuh',
          operator: 'equals',
          trigger_value: 'Ya',
          action: 'show'
        }
      }
    ]
  });
  assert.strictEqual(q.statusCode, 201);
  assert.strictEqual(q.body.success, true);
  assert.strictEqual(q.body.data.question.response_type, 'structured');
  const qId = q.body.data._id;
  console.log('   ✅ Pertanyaan kuesioner berhasil dibuat, ID:', qId);

  // 3b. Menguji POST /api/qna/questions tanpa content eksplisit (fallback ke label pertanyaan pertama)
  console.log('3b. Menguji POST /api/qna/questions dengan fallback judul otomatis dan upload_text');
  const qFallback = await invoke('POST', '/api/qna/questions', {
    session_id: 'default_session',
    content: '',
    author: '',
    is_anon: true,
    response_type: 'structured',
    fields: [
      {
        field_id: 'f_test_fallback',
        type: 'file',
        label: 'Lampirkan Foto Kartu Identitas',
        upload_text: 'Klik atau Ambil Foto KTP',
        required: true
      }
    ]
  });
  assert.strictEqual(qFallback.statusCode, 201);
  assert.strictEqual(qFallback.body.success, true);
  assert.strictEqual(qFallback.body.data.question.content, 'Lampirkan Foto Kartu Identitas');
  assert.strictEqual(qFallback.body.data.question.fields[0].upload_text, 'Klik atau Ambil Foto KTP');
  console.log('   ✅ Fallback judul dan upload_text tersimpan dengan sempurna');

  // 3c. Menguji validasi identitas penanya: wajib isi nama jika is_anon=false
  console.log('3c. Menguji validasi identitas penanya (wajib diisi jika bukan anonim)');
  const qInvalidAuthor = await invoke('POST', '/api/qna/questions', {
    session_id: 'default_session',
    content: 'Pertanyaan tanpa nama dan bukan anonim',
    author: '   ',
    is_anon: false
  });
  assert.strictEqual(qInvalidAuthor.statusCode, 400);
  assert.strictEqual(qInvalidAuthor.body.success, false);
  console.log('   ✅ Backend berhasil memvalidasi dan menolak pertanyaan tanpa nama saat is_anon=false');

  // 4. Submit Jawaban Kuesioner ke Pertanyaan Tersebut
  console.log('4. Menguji POST /api/qna/questions/:id/answers (Jawaban Terstruktur)');
  const ans = await invoke('POST', `/api/qna/questions/${qId}/answers`, {
    answered_by: 'Relawan Dapur',
    answers: {
      f1_butuh: 'Ya',
      f2_porsi: '500 porsi'
    }
  });
  assert.strictEqual(ans.statusCode, 201);
  assert.strictEqual(ans.body.success, true);
  assert.strictEqual(ans.body.data.structured_answers.length, 2);
  console.log('   ✅ Jawaban kuesioner berhasil divalidasi dan disimpan');

  // 4b. Uji Pertanyaan Berkas dengan Tautan Cloud (Google Drive / OneDrive)
  console.log('4b. Menguji POST /api/qna/questions dengan field Berkas & Jawaban Cloud Link');
  const qDoc = await invoke('POST', '/api/qna/questions', {
    author: 'Pengawas Lapangan',
    content: 'Pengumpulan Dokumentasi & Laporan Kegiatan',
    response_type: 'structured',
    fields: [
      {
        field_id: 'f_doc',
        type: 'file',
        label: 'Upload Berkas LPJ / Foto Kegiatan',
        required: true
      },
      {
        field_id: 'f_note',
        type: 'short_text',
        label: 'Catatan Khusus Berkas',
        logic: {
          parent_id: 'f_doc',
          operator: 'filled',
          action: 'show'
        }
      }
    ]
  });
  assert.strictEqual(qDoc.statusCode, 201);
  const qDocId = qDoc.body.data._id;

  const ansCloud = await invoke('POST', `/api/qna/questions/${qDocId}/answers`, {
    answered_by: 'Staf Dokumentasi',
    answers: {
      f_doc: 'https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing',
      f_note: 'Berkas ukuran 25MB tersimpan di Google Drive'
    }
  });
  assert.strictEqual(ansCloud.statusCode, 201);
  assert.strictEqual(ansCloud.body.success, true);
  const fileAnswer = ansCloud.body.data.structured_answers.find(sa => sa.field_id === 'f_doc');
  assert.ok(fileAnswer, 'Jawaban f_doc harus ada');
  assert.strictEqual(fileAnswer.file_info.is_cloud_link, true);
  assert.strictEqual(fileAnswer.file_info.url, 'https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing');
  console.log('   ✅ Tautan cloud storage berhasil divalidasi sebagai pemenuhan field berkas!');

  // 5. Upvote
  console.log('5. Menguji POST /api/qna/questions/:id/upvote');
  const uv = await invoke('POST', `/api/qna/questions/${qId}/upvote`, {
    fingerprint: 'device_tester_uuid_beta'
  });
  assert.strictEqual(uv.statusCode, 200);
  assert.strictEqual(uv.body.upvoted, true);
  assert.strictEqual(uv.body.upvotesCount, 1);
  console.log('   ✅ Upvote berhasil ditambahkan');

  // 6. Login Admin
  console.log('6. Menguji POST /api/admin/login');
  const l = await invoke('POST', '/api/admin/login', {
    username: 'admin_utama',
    password: 'admin123'
  });
  assert.strictEqual(l.statusCode, 200);
  assert.ok(l.body.token);
  const token = l.body.token;
  console.log('   ✅ Login admin berhasil!');

  // 7. Ubah status moderasi
  console.log('7. Menguji PATCH /api/qna/questions/:id/status');
  const st = await invoke('PATCH', `/api/qna/questions/${qId}/status`, { status: 'answered' }, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(st.statusCode, 200);
  assert.strictEqual(st.body.data.status, 'answered');
  console.log('   ✅ Status diubah menjadi "answered"');

  // 8. Admin Statistik
  console.log('8. Menguji GET /api/admin/stats');
  const stats = await invoke('GET', '/api/admin/stats?session_id=default_session', null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(stats.statusCode, 200);
  assert.ok(stats.body.data.structuredQuestionsCount >= 1);
  console.log('   ✅ Statistik Q&A terverifikasi: Structured Questions =', stats.body.data.structuredQuestionsCount);

  // 9. Ekspor Excel Tanya Jawab
  console.log('9. Menguji GET /api/qna/export/excel');
  const ex = await invoke('GET', '/api/qna/export/excel?session_id=default_session', null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(ex.statusCode, 200);
  assert.ok(Buffer.isBuffer(ex.body) || typeof ex.body === 'object');
  console.log('   ✅ Ekspor Excel Tanya Jawab berhasil');

  // 10. Ekspor CSV Tanya Jawab
  console.log('10. Menguji GET /api/qna/export/csv');
  const csv = await invoke('GET', '/api/qna/export/csv?session_id=default_session', null, {
    authorization: `Bearer ${token}`
  });
  assert.strictEqual(csv.statusCode, 200);
  assert.ok(csv.body.includes('dapur umum'));
  console.log('   ✅ Ekspor CSV Tanya Jawab berhasil');

  console.log('\n🎉 SELURUH PENGUJIAN IN-PROCESS BERHASIL 100%!');
}

run().catch((err) => {
  console.error('Error saat uji:', err);
  process.exit(1);
});
