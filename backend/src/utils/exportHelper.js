const XLSX = require('xlsx');

/**
 * Format seluruh data Tanya Jawab & Jawaban Kuesioner ke Excel (.xlsx)
 * @param {Array} questions - Daftar pertanyaan (QnaThread)
 * @returns {Buffer}
 */
function exportQnaToExcel(questions = []) {
  const qRows = [];
  const ansRows = [];

  questions.forEach((q, idx) => {
    qRows.push({
      'No': idx + 1,
      'ID Pertanyaan': q._id,
      'Penanya': q.question?.is_anon ? 'Anonim' : (q.question?.author || 'Peserta'),
      'Pertanyaan': q.question?.content || '',
      'Tipe Format': q.question?.response_type === 'structured' ? 'Kuesioner / Pilihan' : 'Teks Bebas',
      'Jumlah Upvotes': q.upvotes?.length || 0,
      'Jumlah Jawaban': q.answers?.length || 0,
      'Status': q.status || 'open',
      'Waktu Pengajuan': q.question?.submitted_at ? new Date(q.question.submitted_at).toLocaleString('id-ID') : '-'
    });

    // Rincian setiap jawaban
    (q.answers || []).forEach((ans, aIdx) => {
      let answerDetail = ans.content || '';
      if (ans.structured_answers && ans.structured_answers.length > 0) {
        answerDetail = ans.structured_answers.map((sa) => {
          let val = '';
          if (sa.file_info?.is_cloud_link) {
            val = `[Link Cloud: ${sa.file_info.url || sa.value}]`;
          } else if (sa.file_info) {
            val = `[File: ${sa.file_info.originalname}]`;
          } else if (typeof sa.value === 'string' && (sa.value.startsWith('http://') || sa.value.startsWith('https://'))) {
            val = `[Link Cloud: ${sa.value}]`;
          } else {
            val = Array.isArray(sa.value) ? sa.value.join(', ') : (sa.value !== undefined && sa.value !== null ? sa.value : '-');
          }
          return `${sa.field_id}: ${val}`;
        }).join(' | ');
      }

      ansRows.push({
        'No Pertanyaan': idx + 1,
        'Pertanyaan': q.question?.content || '',
        'No Jawaban': aIdx + 1,
        'Dijawab Oleh': ans.answered_by + (ans.is_facilitator ? ' (Fasilitator)' : ''),
        'Waktu Menjawab': ans.answered_at ? new Date(ans.answered_at).toLocaleString('id-ID') : '-',
        'Isi / Rincian Jawaban': answerDetail
      });
    });
  });

  const workbook = XLSX.utils.book_new();

  const qSheet = XLSX.utils.json_to_sheet(qRows.length > 0 ? qRows : [{ 'Info': 'Belum ada pertanyaan' }]);
  XLSX.utils.book_append_sheet(workbook, qSheet, 'Daftar Pertanyaan');

  const ansSheet = XLSX.utils.json_to_sheet(ansRows.length > 0 ? ansRows : [{ 'Info': 'Belum ada jawaban' }]);
  XLSX.utils.book_append_sheet(workbook, ansSheet, 'Rincian Jawaban');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Format data Tanya Jawab ke format CSV
 */
function exportQnaToCSV(questions = []) {
  const headers = [
    'No',
    'ID Pertanyaan',
    'Penanya',
    'Pertanyaan',
    'Tipe Format',
    'Upvotes',
    'Status',
    'Waktu Pengajuan',
    'Total Jawaban',
    'Rangkuman Jawaban'
  ];

  const lines = [headers.join(',')];

  questions.forEach((q, idx) => {
    let summaryAnswers = (q.answers || []).map((ans) => {
      let txt = ans.content || '';
      if (ans.structured_answers) {
        txt = ans.structured_answers.map((sa) => {
          let val = '';
          if (sa.file_info?.is_cloud_link) {
            val = `[Link Cloud: ${sa.file_info.url || sa.value}]`;
          } else if (sa.file_info) {
            val = `[File: ${sa.file_info.originalname}]`;
          } else if (typeof sa.value === 'string' && (sa.value.startsWith('http://') || sa.value.startsWith('https://'))) {
            val = `[Link Cloud: ${sa.value}]`;
          } else {
            val = Array.isArray(sa.value) ? sa.value.join(';') : (sa.value !== undefined && sa.value !== null ? sa.value : '-');
          }
          return `${sa.field_id}: ${val}`;
        }).join(' | ');
      }
      return `${ans.answered_by}: ${txt}`;
    }).join(' // ');

    const row = [
      idx + 1,
      `"${q._id}"`,
      `"${q.question?.is_anon ? 'Anonim' : (q.question?.author || 'Peserta')}"`,
      `"${(q.question?.content || '').replace(/"/g, '""')}"`,
      `"${q.question?.response_type === 'structured' ? 'Kuesioner' : 'Teks Bebas'}"`,
      q.upvotes?.length || 0,
      `"${q.status || 'open'}"`,
      `"${q.question?.submitted_at ? new Date(q.question.submitted_at).toLocaleString('id-ID') : '-'}"`,
      q.answers?.length || 0,
      `"${summaryAnswers.replace(/"/g, '""')}"`
    ];

    lines.push(row.join(','));
  });

  return lines.join('\n');
}

module.exports = {
  exportQnaToExcel,
  exportQnaToCSV
};
