const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { evaluateCondition, isFieldVisible } = require('../utils/conditionEngine');
const { verifyMagicBytes } = require('../middleware/upload');
const { exportQnaToExcel, exportQnaToCSV } = require('../utils/exportHelper');

console.log('🧪 Memulai Pengujian Unit & Logika Tanya Jawab Berstruktur...\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. Uji Mesin Logika Kondisional (TDD v2.0 Sec 3)
// -------------------------------------------------------------
console.log('▶️ Menguji Mesin Logika Kondisional (Condition Engine):');

it('Operator "equals": mencocokkan nilai persis dengan toleransi whitespace & huruf besar/kecil', () => {
  const rule = { parent_id: 'q1', operator: 'equals', trigger_value: 'Ya, Butuh Bantuan', action: 'show' };
  assert.strictEqual(evaluateCondition('Ya, Butuh Bantuan', rule), true);
  assert.strictEqual(evaluateCondition('ya, butuh bantuan', rule), true);
  assert.strictEqual(evaluateCondition('Tidak', rule), false);
  assert.strictEqual(evaluateCondition(null, rule), false);
});

it('Operator "not_equals": mengembalikan true jika tidak cocok', () => {
  const rule = { parent_id: 'q1', operator: 'not_equals', trigger_value: 'Tidak', action: 'show' };
  assert.strictEqual(evaluateCondition('Ya', rule), true);
  assert.strictEqual(evaluateCondition('Tidak', rule), false);
});

it('Operator "contains": mencocokkan pilihan di dalam array checkbox', () => {
  const rule = { parent_id: 'q3', operator: 'contains', trigger_value: 'Lainnya', action: 'show' };
  assert.strictEqual(evaluateCondition(['Logistik', 'Lainnya'], rule), true);
  assert.strictEqual(evaluateCondition(['Logistik'], rule), false);
  assert.strictEqual(evaluateCondition('Ada kendala lainnya di lapangan', rule), true);
});

it('Operator "all_selected": memastikan semua trigger value terpilih', () => {
  const rule = { parent_id: 'q3', operator: 'all_selected', trigger_value: ['Logistik', 'Obat'], action: 'show' };
  assert.strictEqual(evaluateCondition(['Logistik', 'Obat', 'Makanan'], rule), true);
  assert.strictEqual(evaluateCondition(['Logistik'], rule), false);
});

it('Operator "filled": memeriksa apakah jawaban teks/berkas sudah diisi', () => {
  const rule = { parent_id: 'q_text', operator: 'filled', action: 'show' };
  assert.strictEqual(evaluateCondition('Ada kendala jembatan', rule), true);
  assert.strictEqual(evaluateCondition('', rule), false);
  assert.strictEqual(evaluateCondition('   ', rule), false);
  assert.strictEqual(evaluateCondition(null, rule), false);
  assert.strictEqual(evaluateCondition(undefined, rule), false);
  assert.strictEqual(evaluateCondition([], rule), false);
  assert.strictEqual(evaluateCondition(['foto_posko.jpg'], rule), true);
});

it('Operator "empty": memeriksa apakah jawaban masih kosong / belum diisi', () => {
  const rule = { parent_id: 'q_text', operator: 'empty', action: 'show' };
  assert.strictEqual(evaluateCondition('', rule), true);
  assert.strictEqual(evaluateCondition(null, rule), true);
  assert.strictEqual(evaluateCondition([], rule), true);
  assert.strictEqual(evaluateCondition('Sudah diisi', rule), false);
});

it('isFieldVisible: menangani field tanpa logic dan field dengan percabangan bertingkat', () => {
  const baseField = { field_id: 'q1', type: 'radio', logic: null };
  assert.strictEqual(isFieldVisible(baseField, {}), true);

  const childField = {
    field_id: 'q2',
    type: 'short_text',
    logic: { parent_id: 'q1', operator: 'equals', trigger_value: 'Ya', action: 'show' }
  };
  assert.strictEqual(isFieldVisible(childField, { q1: 'Ya' }), true);
  assert.strictEqual(isFieldVisible(childField, { q1: 'Tidak' }), false);
});

// -------------------------------------------------------------
// 2. Uji Verifikasi Magic Bytes (TDD v2.0 Sec 5)
// -------------------------------------------------------------
console.log('\n▶️ Menguji Verifikasi Magic-Bytes Upload:');

const tmpDir = path.join(__dirname, 'tmp_test_files');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const validPdfPath = path.join(tmpDir, 'test.pdf');
const validPngPath = path.join(tmpDir, 'test.png');
const validJpgPath = path.join(tmpDir, 'test.jpg');
const fakePdfPath = path.join(tmpDir, 'fake.pdf');

fs.writeFileSync(validPdfPath, Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46]), Buffer.from('-1.7 sample data')]));
fs.writeFileSync(validPngPath, Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.from('png content')]));
fs.writeFileSync(validJpgPath, Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.from('jpeg content')]));
fs.writeFileSync(fakePdfPath, Buffer.from('Halo ini teks biasa yang menyamar sebagai pdf'));

it('Memvalidasi Magic-Bytes PDF asli (%PDF / 25 50 44 46)', () => {
  const res = verifyMagicBytes(validPdfPath);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.type, 'pdf');
});

it('Memvalidasi Magic-Bytes PNG asli (89 50 4E 47)', () => {
  const res = verifyMagicBytes(validPngPath);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.type, 'png');
});

it('Memvalidasi Magic-Bytes JPEG asli (FF D8 FF)', () => {
  const res = verifyMagicBytes(validJpgPath);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.type, 'jpeg');
});

it('Menolak file teks palsu yang menyamar sebagai PDF (Magic Bytes Mismatch)', () => {
  const res = verifyMagicBytes(fakePdfPath);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.type, 'unknown');
});

try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (_) {}

// -------------------------------------------------------------
// 3. Uji Ekspor Tanya Jawab & Kuesioner Terpadu ke Excel & CSV
// -------------------------------------------------------------
console.log('\n▶️ Menguji Ekspor Q&A ke Excel & CSV:');

const sampleQuestions = [
  {
    _id: 'q_test_1',
    question: {
      content: 'Evaluasi Titik Pengungsian',
      author: 'Fasilitator',
      is_anon: false,
      response_type: 'structured',
      submitted_at: new Date()
    },
    upvotes: ['fp_1', 'fp_2'],
    answers: [
      {
        answer_id: 'ans_1',
        answered_by: 'Budi Santoso',
        is_facilitator: false,
        answered_at: new Date(),
        content: '',
        structured_answers: [
          { field_id: 'q1_status', value: 'Siap Pakai' }
        ]
      }
    ],
    status: 'answered'
  }
];

it('Menghasilkan Buffer Excel (.xlsx) dari daftar Tanya Jawab & Jawaban Kuesioner', () => {
  const excelBuf = exportQnaToExcel(sampleQuestions);
  assert.ok(Buffer.isBuffer(excelBuf));
  assert.ok(excelBuf.length > 500);
});

it('Menghasilkan CSV valid dari daftar Tanya Jawab', () => {
  const csv = exportQnaToCSV(sampleQuestions);
  assert.ok(csv.includes('Evaluasi Titik Pengungsian'));
  assert.ok(csv.includes('Budi Santoso'));
  assert.ok(csv.includes('Kuesioner'));
});

it('Memformat tautan penyimpanan cloud [Link Cloud: ...] pada ekspor Excel & CSV', () => {
  const cloudQuestions = [
    {
      _id: 'q_cloud_1',
      question: { content: 'Dokumen LPJ Lapangan', response_type: 'structured' },
      answers: [
        {
          answered_by: 'Koordinator',
          structured_answers: [
            {
              field_id: 'file_lpj',
              value: 'https://drive.google.com/file/d/abc12345/view',
              file_info: {
                is_cloud_link: true,
                url: 'https://drive.google.com/file/d/abc12345/view'
              }
            }
          ]
        }
      ]
    }
  ];

  const excelBuf = exportQnaToExcel(cloudQuestions);
  assert.ok(Buffer.isBuffer(excelBuf));

  const csv = exportQnaToCSV(cloudQuestions);
  assert.ok(csv.includes('[Link Cloud: https://drive.google.com/file/d/abc12345/view]'));
});

console.log(`\n====================================================`);
console.log(`Hasil Pengujian: ${passedTests}/${totalTests} Uji Berhasil!`);
console.log(`====================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
