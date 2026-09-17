const http = require('http');
const assert = require('assert');
const { app, startServer } = require('../server');

async function runE2ETests() {
  console.log('🚀 Menjalankan Pengujian Integrasi End-to-End (E2E)...\n');

  // Gunakan port dinamis untuk pengetesan
  process.env.PORT = 5099;
  const server = await startServer();

  function request(options, postData = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: '127.0.0.1',
        port: 5099,
        path: options.path,
        method: options.method || 'GET',
        headers: {
          ...headers,
          ...(postData && typeof postData === 'object' && !Buffer.isBuffer(postData) ? { 'Content-Type': 'application/json' } : {})
        }
      };

      const req = http.request(reqOptions, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(buffer.toString('utf8'));
          } catch (_) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: buffer.toString('utf8'),
            buffer,
            json
          });
        });
      });

      req.on('error', reject);

      if (postData) {
        if (Buffer.isBuffer(postData)) {
          req.write(postData);
        } else if (typeof postData === 'object') {
          req.write(JSON.stringify(postData));
        } else {
          req.write(postData);
        }
      }
      req.end();
    });
  }

  try {
    // 1. Health Check
    console.log('1. Menguji GET /api/health');
    const resHealth = await request({ path: '/api/health' });
    assert.strictEqual(resHealth.statusCode, 200);
    assert.strictEqual(resHealth.json.status, 'ok');
    console.log('   ✅ Health check OK');

    // 2. Session Info
    console.log('2. Menguji GET /api/admin/session');
    const resSess = await request({ path: '/api/admin/session?session_id=default_session' });
    assert.strictEqual(resSess.statusCode, 200);
    assert.strictEqual(resSess.json.success, true);
    console.log('   ✅ Sesi aktif ditemukan:', resSess.json.data.title);

    // 3. Q&A: Buat Pertanyaan Baru
    console.log('3. Menguji POST /api/qna/questions');
    const resNewQ = await request(
      { path: '/api/qna/questions', method: 'POST' },
      {
        session_id: 'default_session',
        content: 'Berapa lama masa recovery setelah penanganan tahap pertama?',
        author: 'Dewi Sartika',
        is_anon: false
      }
    );
    assert.strictEqual(resNewQ.statusCode, 201);
    assert.strictEqual(resNewQ.json.success, true);
    const createdQuestionId = resNewQ.json.data._id;
    console.log('   ✅ Pertanyaan baru berhasil dibuat, ID:', createdQuestionId);

    // 4. Q&A: Upvote
    console.log('4. Menguji POST /api/qna/questions/:id/upvote');
    const resUpvote = await request(
      { path: `/api/qna/questions/${createdQuestionId}/upvote`, method: 'POST' },
      { fingerprint: 'test_device_uuid_999' }
    );
    assert.strictEqual(resUpvote.statusCode, 200);
    assert.strictEqual(resUpvote.json.upvoted, true);
    assert.strictEqual(resUpvote.json.upvotesCount, 1);
    console.log('   ✅ Upvote berhasil ditambahkan');

    // 5. Q&A: Tambah Jawaban Thread
    console.log('5. Menguji POST /api/qna/questions/:id/answers');
    const resAns = await request(
      { path: `/api/qna/questions/${createdQuestionId}/answers`, method: 'POST' },
      {
        content: 'Estimasi masa pemulihan normal berkisar antara 3 hingga 5 hari kerja.',
        answered_by: 'Budi (Koordinator Lapangan)'
      }
    );
    assert.strictEqual(resAns.statusCode, 201);
    assert.strictEqual(resAns.json.success, true);
    console.log('   ✅ Jawaban thread berhasil disimpan');

    // 6. Login Admin Tersembunyi
    console.log('6. Menguji POST /api/admin/login');
    const resLogin = await request(
      { path: '/api/admin/login', method: 'POST' },
      { username: 'admin_utama', password: 'admin123' }
    );
    assert.strictEqual(resLogin.statusCode, 200);
    assert.strictEqual(resLogin.json.success, true);
    assert.ok(resLogin.json.token);
    const adminToken = resLogin.json.token;
    console.log('   ✅ Login admin berhasil, JWT token diterima');

    // 7. Admin Moderasi Status
    console.log('7. Menguji PATCH /api/qna/questions/:id/status (Khusus Admin)');
    const resStatus = await request(
      { path: `/api/qna/questions/${createdQuestionId}/status`, method: 'PATCH' },
      { status: 'answered' },
      { 'Authorization': `Bearer ${adminToken}` }
    );
    assert.strictEqual(resStatus.statusCode, 200);
    assert.strictEqual(resStatus.json.data.status, 'answered');
    console.log('   ✅ Status pertanyaan berhasil diubah ke "answered"');

    // 8. Form Aktif
    console.log('8. Menguji GET /api/form/active');
    const resForm = await request({ path: '/api/form/active?session_id=default_session' });
    assert.strictEqual(resForm.statusCode, 200);
    assert.strictEqual(resForm.json.success, true);
    assert.strictEqual(resForm.json.data.fields.length, 5);
    console.log('   ✅ Formulir kondisional bertingkat (5 fields) berhasil dimuat');

    // 9. Submit Tanggapan Form
    console.log('9. Menguji POST /api/form/submit');
    const resSub = await request(
      { path: '/api/form/submit', method: 'POST' },
      {
        session_id: 'default_session',
        respondent_id: 'respondent_tester_123',
        answers: {
          q1_tipe_peserta: 'Ya, Instansi Resmi',
          q2_nama_instansi: 'Badan Penanggulangan Bencana',
          q3_kendala: ['Logistik & Distribusi', 'Lainnya'],
          q3_uraian_lainnya: 'Keterbatasan armada angkut di titik pegunungan'
        }
      }
    );
    assert.strictEqual(resSub.statusCode, 201);
    assert.strictEqual(resSub.json.success, true);
    console.log('   ✅ Tanggapan kuesioner berhasil disimpan di database');

    // 10. Ekspor Excel
    console.log('10. Menguji GET /api/form/export/excel (Khusus Admin)');
    const resExcel = await request(
      { path: '/api/form/export/excel?session_id=default_session' },
      null,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    assert.strictEqual(resExcel.statusCode, 200);
    assert.ok(resExcel.buffer.length > 1000);
    console.log('   ✅ File rekapitulasi Excel (.xlsx) berhasil digenerate, ukuran:', resExcel.buffer.length, 'bytes');

    // 11. Ekspor CSV
    console.log('11. Menguji GET /api/form/export/csv (Khusus Admin)');
    const resCsv = await request(
      { path: '/api/form/export/csv?session_id=default_session' },
      null,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    assert.strictEqual(resCsv.statusCode, 200);
    assert.ok(resCsv.body.includes('Badan Penanggulangan Bencana'));
    console.log('   ✅ File CSV berhasil digenerate dengan konten valid');

    // 12. Frontend SPA Routing
    console.log('12. Menguji Akses SPA / dan /admin');
    const resSpaRoot = await request({ path: '/' });
    assert.strictEqual(resSpaRoot.statusCode, 200);
    assert.ok(resSpaRoot.body.includes('Forum Tanya Jawab & Evaluasi Interaktif'));

    const resSpaAdmin = await request({ path: '/admin' });
    assert.strictEqual(resSpaAdmin.statusCode, 200);
    assert.ok(resSpaAdmin.body.includes('Forum Tanya Jawab & Evaluasi Interaktif'));
    console.log('   ✅ Halaman SPA diakses dengan sukses pada rute / dan /admin');

    console.log('\n🎉 SELURUH PENGUJIAN END-TO-END BERHASIL 100% TANPA KENDALA!\n');
  } catch (err) {
    console.error('❌ Terjadi kesalahan pada uji E2E:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runE2ETests();

