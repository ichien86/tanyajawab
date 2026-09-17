const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { QnaThread } = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { upload, validateUploadedFile, UPLOAD_DIR } = require('../middleware/upload');
const { isFieldVisible } = require('../utils/conditionEngine');
const { exportQnaToExcel, exportQnaToCSV } = require('../utils/exportHelper');
const { broadcastEvent } = require('./events');
const { v4: uuidv4 } = require('uuid');

/**
 * Menghapus berkas lampiran fisik di server saat jawaban/pertanyaan dihapus
 */
function cleanupAnswerFiles(answers) {
  if (!Array.isArray(answers)) return;
  answers.forEach((ans) => {
    if (!ans || !Array.isArray(ans.structured_answers)) return;
    ans.structured_answers.forEach((sa) => {
      if (sa && sa.file_info && sa.file_info.filename && !sa.file_info.is_cloud_link) {
        const safeFilename = path.basename(sa.file_info.filename);
        const filePath = path.join(UPLOAD_DIR, safeFilename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Storage] Berkas fisik terhapus dari disk: ${safeFilename}`);
          }
        } catch (err) {
          console.warn(`[Storage] Gagal menghapus berkas ${safeFilename}:`, err.message);
        }
      }
    });
  });
}

/**
 * GET /api/qna/questions
 * Mendapatkan daftar pertanyaan sesi
 */
router.get('/questions', async (req, res) => {
  try {
    const sessionId = req.query.session_id || 'default_session';
    const sort = req.query.sort || 'top'; // 'top' | 'newest' | 'unanswered'
    const search = (req.query.search || '').trim().toLowerCase();
    const isAdmin = req.query.is_admin === 'true';

    let filter = { session_id: sessionId };
    if (!isAdmin) {
      filter.status = { $ne: 'hidden' };
    }

    let allQuestions = await QnaThread.find(filter);

    if (!isAdmin) {
      allQuestions = allQuestions.filter((q) => q.status !== 'hidden');
    }

    const counts = {
      total: allQuestions.length,
      unanswered: allQuestions.filter((q) => q.status === 'open' || (q.status !== 'answered' && (!q.answers || q.answers.length === 0))).length,
      answered: allQuestions.filter((q) => q.status === 'answered' || (q.answers && q.answers.length > 0)).length
    };

    let questions = [...allQuestions];

    // Filter pencarian
    if (search) {
      questions = questions.filter((q) => {
        const contentMatch = (q.question?.content || '').toLowerCase().includes(search);
        const authorMatch = (q.question?.author || '').toLowerCase().includes(search);
        return contentMatch || authorMatch;
      });
    }

    // Pengurutan
    if (sort === 'top') {
      questions.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
    } else if (sort === 'newest') {
      questions.sort((a, b) => new Date(b.question?.submitted_at || b.createdAt) - new Date(a.question?.submitted_at || a.createdAt));
    } else if (sort === 'unanswered') {
      questions = questions.filter((q) => q.status === 'open' || (q.status !== 'answered' && (!q.answers || q.answers.length === 0)));
      questions.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
    }

    res.json({
      success: true,
      total: questions.length,
      counts,
      data: questions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat pertanyaan: ' + err.message });
  }
});

/**
 * POST /api/qna/questions
 * Mengajukan pertanyaan baru oleh penanya (bisa teks bebas atau berstruktur kuesioner)
 */
router.post('/questions', async (req, res) => {
  try {
    const {
      session_id = 'default_session',
      content,
      author,
      is_anon = false,
      response_type = 'free_text',
      fields = []
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Isi pertanyaan tidak boleh kosong.' });
    }

    // Format fields jika tipe terstruktur kuesioner
    let formattedFields = [];
    if (response_type === 'structured' && Array.isArray(fields)) {
      formattedFields = fields.map((f, idx) => ({
        field_id: f.field_id || `field_${Date.now()}_${idx}`,
        type: f.type || 'short_text',
        label: f.label || `Pertanyaan #${idx + 1}`,
        options: Array.isArray(f.options) ? f.options : [],
        required: Boolean(f.required),
        order: idx + 1,
        logic: f.logic && f.logic.parent_id ? {
          parent_id: f.logic.parent_id,
          operator: f.logic.operator || 'equals',
          trigger_value: f.logic.trigger_value,
          action: f.logic.action || 'show'
        } : null
      }));
    }

    const newQuestion = await QnaThread.create({
      session_id,
      question: {
        content: content.trim(),
        author: is_anon ? null : (author ? author.trim() : 'Peserta'),
        is_anon: Boolean(is_anon),
        response_type: response_type === 'structured' ? 'structured' : 'free_text',
        fields: formattedFields,
        submitted_at: new Date()
      },
      upvotes: [],
      answers: [],
      status: 'open'
    });

    broadcastEvent('qna_update', {
      action: 'question_created',
      question: newQuestion
    });

    res.status(201).json({
      success: true,
      message: 'Pertanyaan berhasil diajukan.',
      data: newQuestion
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengajukan pertanyaan: ' + err.message });
  }
});

/**
 * POST /api/qna/questions/:id/upvote
 * Toggle upvote pertanyaan menggunakan fingerprint / UUID peserta
 */
router.post('/questions/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    const { fingerprint } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ success: false, message: 'Device fingerprint diperlukan untuk upvote.' });
    }

    const question = await QnaThread.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan.' });
    }

    let upvotes = Array.isArray(question.upvotes) ? [...question.upvotes] : [];
    const hasUpvoted = upvotes.includes(fingerprint);

    if (hasUpvoted) {
      upvotes = upvotes.filter((fp) => fp !== fingerprint);
    } else {
      upvotes.push(fingerprint);
    }

    const updated = await QnaThread.findByIdAndUpdate(id, { $set: { upvotes } }, { new: true });

    broadcastEvent('qna_update', {
      action: 'upvote_toggled',
      id,
      upvotesCount: upvotes.length,
      hasUpvoted: !hasUpvoted
    });

    res.json({
      success: true,
      upvoted: !hasUpvoted,
      upvotesCount: upvotes.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memproses upvote: ' + err.message });
  }
});

/**
 * POST /api/qna/questions/:id/answers
 * Menambahkan jawaban (bisa teks bebas atau jawaban kuesioner terstruktur dengan upload file)
 */
router.post('/questions/:id/answers', upload.single('file'), validateUploadedFile, async (req, res) => {
  try {
    const { id } = req.params;
    const question = await QnaThread.findById(id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan.' });
    }

    const answered_by = req.body.answered_by || 'Peserta';
    const is_facilitator = req.body.is_facilitator === 'true' || req.body.is_facilitator === true;

    let newAnswer = {
      answer_id: uuidv4(),
      answered_by: String(answered_by).trim(),
      answered_at: new Date(),
      is_facilitator: Boolean(is_facilitator),
      content: '',
      structured_answers: []
    };

    if (question.question?.response_type === 'structured') {
      // Parsing jawaban kuesioner
      let rawAnswers = req.body.answers;
      let answersObj = {};
      if (typeof rawAnswers === 'string') {
        try {
          answersObj = JSON.parse(rawAnswers);
        } catch (_) {
          answersObj = {};
        }
      } else if (rawAnswers && typeof rawAnswers === 'object') {
        answersObj = rawAnswers;
      }

      let uploadedFileInfo = null;
      if (req.file) {
        uploadedFileInfo = {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          verifiedType: req.file.verifiedType
        };

        const questionFields = question.question?.fields || [];
        for (const f of questionFields) {
          if (f.type === 'file') {
            answersObj[f.field_id] = req.file.originalname;
          }
        }
      }

      // Evaluasi anti-tampering logika kondisional di server (TDD v2.0 Sec 3)
      const fields = question.question?.fields || [];
      const processedAnswers = [];

      for (const field of fields) {
        const visible = isFieldVisible(field, answersObj);
        if (!visible) continue;

        if (field.type === 'file') {
          const rawVal = answersObj[field.field_id];
          const cloudVal = typeof rawVal === 'string' ? rawVal.trim() : '';
          const isUrl = cloudVal.startsWith('http://') || cloudVal.startsWith('https://');

          if (uploadedFileInfo) {
            processedAnswers.push({
              field_id: field.field_id,
              value: uploadedFileInfo.originalname,
              file_info: uploadedFileInfo
            });
          } else if (isUrl) {
            processedAnswers.push({
              field_id: field.field_id,
              value: cloudVal,
              file_info: {
                filename: '',
                originalname: 'Tautan Penyimpanan Online',
                size: 0,
                mimetype: 'text/uri-list',
                is_cloud_link: true,
                url: cloudVal
              }
            });
          } else if (field.required) {
            return res.status(400).json({ success: false, message: `Berkas atau tautan online pada "${field.label}" wajib diisi.` });
          }
        } else {
          const val = answersObj[field.field_id];
          if (field.required && (val === undefined || val === null || val === '')) {
            return res.status(400).json({ success: false, message: `Pertanyaan "${field.label}" wajib diisi.` });
          }
          processedAnswers.push({
            field_id: field.field_id,
            value: val !== undefined ? val : null
          });
        }
      }

      newAnswer.structured_answers = processedAnswers;
      newAnswer.content = processedAnswers.map((p) => p.value).filter(Boolean).join(', ');
    } else {
      // Pertanyaan teks bebas biasa
      const content = req.body.content || '';
      if (!content.trim()) {
        return res.status(400).json({ success: false, message: 'Isi jawaban tidak boleh kosong.' });
      }
      newAnswer.content = content.trim();
    }

    let answers = Array.isArray(question.answers) ? [...question.answers] : [];
    answers.push(newAnswer);

    let newStatus = question.status === 'open' ? 'answered' : question.status;
    await QnaThread.findByIdAndUpdate(id, { $set: { answers, status: newStatus } }, { new: true });

    broadcastEvent('qna_update', {
      action: 'answer_added',
      id,
      answer: newAnswer,
      status: newStatus
    });

    res.status(201).json({
      success: true,
      message: 'Tanggapan/jawaban berhasil dikirim.',
      data: newAnswer
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengirim jawaban: ' + err.message });
  }
});

/**
 * PATCH /api/qna/questions/:id/status
 * Moderasi status pertanyaan - Khusus Admin
 */
router.patch('/questions/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'answered', 'hidden'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    const updated = await QnaThread.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan.' });
    }

    broadcastEvent('qna_update', { action: 'status_changed', id, status });

    res.json({ success: true, message: `Status berhasil diubah menjadi ${status}.`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/qna/questions/:id
 * Menghapus thread pertanyaan - Khusus Admin
 */
router.delete('/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await QnaThread.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan.' });
    }

    // Hapus seluruh berkas lampiran fisik terkait pertanyaan ini di disk server
    cleanupAnswerFiles(existing.answers);

    await QnaThread.findByIdAndDelete(id);

    broadcastEvent('qna_update', { action: 'question_deleted', id });
    res.json({ success: true, message: 'Pertanyaan dan berkas terkait berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/qna/questions/:id/answers/:answerId
 * Menghapus jawaban tertentu - Khusus Admin
 */
router.delete('/questions/:id/answers/:answerId', authenticateAdmin, async (req, res) => {
  try {
    const { id, answerId } = req.params;
    const question = await QnaThread.findById(id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan.' });
    }

    // Bersihkan berkas fisik yang menempel pada jawaban ini
    const deletedAnswer = (question.answers || []).find((a) => String(a.answer_id) === String(answerId));
    if (deletedAnswer) {
      cleanupAnswerFiles([deletedAnswer]);
    }

    let answers = (question.answers || []).filter((a) => String(a.answer_id) !== String(answerId));
    await QnaThread.findByIdAndUpdate(id, { $set: { answers } }, { new: true });

    broadcastEvent('qna_update', { action: 'answer_deleted', id, answerId });
    res.json({ success: true, message: 'Jawaban dan berkas terkait berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/qna/session/:sessionId/clear-all
 * Membersihkan seluruh pertanyaan dan berkas lampirannya pada suatu sesi - Khusus Admin
 */
router.delete('/session/:sessionId/clear-all', authenticateAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const questions = await QnaThread.find({ session_id: sessionId });

    for (const q of questions) {
      cleanupAnswerFiles(q.answers);
    }

    await QnaThread.deleteMany({ session_id: sessionId });

    broadcastEvent('qna_update', { action: 'session_cleared', sessionId });
    res.json({ success: true, message: 'Seluruh pertanyaan dan berkas pada sesi berhasil dibersihkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/qna/export/excel
 * Ekspor seluruh data Tanya Jawab ke Excel (.xlsx) - Khusus Admin
 */
router.get('/export/excel', authenticateAdmin, async (req, res) => {
  try {
    const sessionId = req.query.session_id || 'default_session';
    const questions = await QnaThread.find({ session_id: sessionId });

    const buffer = exportQnaToExcel(questions);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Rekap_TanyaJawab_${sessionId}_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengekspor Excel: ' + err.message });
  }
});

/**
 * GET /api/qna/export/csv
 * Ekspor seluruh data Tanya Jawab ke CSV - Khusus Admin
 */
router.get('/export/csv', authenticateAdmin, async (req, res) => {
  try {
    const sessionId = req.query.session_id || 'default_session';
    const questions = await QnaThread.find({ session_id: sessionId });

    const csvContent = exportQnaToCSV(questions);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Rekap_TanyaJawab_${sessionId}_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengekspor CSV: ' + err.message });
  }
});

module.exports = router;
