const bcrypt = require('bcryptjs');
const {
  initDatabase,
  UserAdmin,
  Session,
  QnaThread
} = require('../config/database');

async function runSeed() {
  console.log('🌱 Menjalankan Seeding Database Awal...');
  await initDatabase();

  // 1. Seed Admin Utama
  const adminUsername = process.env.ADMIN_USERNAME || 'admin_utama';
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSCODE || 'admin123';

  const existingAdmin = await UserAdmin.findOne({ username: adminUsername });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await UserAdmin.create({
      username: adminUsername,
      password_hash: passwordHash,
      role: 'administrator',
      is_active: true,
      last_login: new Date(),
      security_logs: []
    });
    console.log(`✅ Admin dibuat: username "${adminUsername}" / sandi siap.`);
  } else if (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSCODE) {
    const isSame = await bcrypt.compare(adminPassword, existingAdmin.password_hash);
    if (!isSame) {
      const salt = await bcrypt.genSalt(12);
      const newHash = await bcrypt.hash(adminPassword, salt);
      await UserAdmin.findByIdAndUpdate(existingAdmin._id, { $set: { password_hash: newHash } });
      console.log('🔄 Kata sandi admin disinkronkan dengan variabel lingkungan.');
    }
  }

  // 2. Seed Sesi Sosialisasi
  const sessionId = 'default_session';
  let existingSession = await Session.findOne({ session_id: sessionId });
  if (!existingSession) {
    existingSession = await Session.create({
      session_id: sessionId,
      title: 'Forum Tanya Jawab & Identifikasi Masalah Lapangan',
      description: 'Ruang interaktif: siapapun boleh bertanya, siapapun boleh menjawab.',
      is_active: true,
      session_code: 'SOS-2026',
      initial_seeded: false
    });
    console.log('✅ Sesi sosialisasi default dibuat.');
  }

  // 3. Seed Thread Q&A (Hanya di-seed 1x saat database pertama kali dibuat)
  if (!existingSession.initial_seeded) {
    const existingThreads = await QnaThread.find({ session_id: sessionId });
    if (existingThreads.length === 0) {
    // Thread 1: Pertanyaan Berstruktur Kuesioner dengan Logika Kondisional
    await QnaThread.create({
      session_id: sessionId,
      question: {
        content: 'Identifikasi Kesiapan Posko & Kendala Lapangan Wilayah Terdampak',
        author: 'Fasilitator BPBD',
        is_anon: false,
        response_type: 'structured',
        fields: [
          {
            field_id: 'q1_tipe',
            type: 'radio',
            label: 'Apakah Anda perwakilan dari instansi/organisasi resmi?',
            options: ['Ya, Instansi Resmi', 'Bukan, Individu / Mandiri'],
            required: true,
            order: 1,
            logic: null
          },
          {
            field_id: 'q2_instansi',
            type: 'short_text',
            label: 'Sebutkan nama instansi / organisasi Anda:',
            required: true,
            order: 2,
            logic: {
              parent_id: 'q1_tipe',
              operator: 'equals',
              trigger_value: 'Ya, Instansi Resmi',
              action: 'show'
            }
          },
          {
            field_id: 'q3_kendala',
            type: 'checkbox',
            label: 'Pilih kendala yang sering dihadapi (bisa pilih lebih dari satu):',
            options: ['Logistik & Distribusi', 'Sistem Pelaporan', 'Regulasi Lapangan', 'Lainnya'],
            required: true,
            order: 3,
            logic: null
          },
          {
            field_id: 'q4_uraian_lainnya',
            type: 'long_text',
            label: 'Jelaskan kendala lainnya yang Anda maksud:',
            required: false,
            order: 4,
            logic: {
              parent_id: 'q3_kendala',
              operator: 'contains',
              trigger_value: 'Lainnya',
              action: 'show'
            }
          },
          {
            field_id: 'q5_upload_bukti',
            type: 'file',
            label: 'Unggah dokumen atau foto bukti pendukung (PDF/JPG/PNG max 2MB):',
            required: false,
            order: 5,
            logic: {
              parent_id: 'q1_tipe',
              operator: 'equals',
              trigger_value: 'Ya, Instansi Resmi',
              action: 'show'
            }
          }
        ],
        submitted_at: new Date(Date.now() - 25 * 60 * 1000)
      },
      upvotes: ['demo_fp_01', 'demo_fp_02', 'demo_fp_03'],
      answers: [
        {
          answer_id: 'ans_structured_01',
          answered_by: 'Budi Santoso',
          answered_at: new Date(Date.now() - 15 * 60 * 1000),
          is_facilitator: false,
          content: 'Ya, Instansi Resmi, Dinas Sosial Prov, Logistik & Distribusi',
          structured_answers: [
            { field_id: 'q1_tipe', value: 'Ya, Instansi Resmi' },
            { field_id: 'q2_instansi', value: 'Dinas Sosial Prov' },
            { field_id: 'q3_kendala', value: ['Logistik & Distribusi'] }
          ]
        }
      ],
      status: 'answered'
    });

    // Thread 2: Pertanyaan Bebas Biasa
    await QnaThread.create({
      session_id: sessionId,
      question: {
        content: 'Bagaimana alur penyaluran bantuan jika akses jembatan utama terputus?',
        author: null,
        is_anon: true,
        response_type: 'free_text',
        fields: [],
        submitted_at: new Date(Date.now() - 10 * 60 * 1000)
      },
      upvotes: ['demo_fp_01'],
      answers: [
        {
          answer_id: 'ans_text_01',
          content: 'Distribusi akan segera dialihkan menggunakan jalur pos aju terdekat.',
          answered_by: 'Fasilitator BPBD',
          answered_at: new Date(Date.now() - 5 * 60 * 1000),
          is_facilitator: true
        }
      ],
      status: 'answered'
    });
    console.log('✅ Contoh pertanyaan awal (terjawab) berhasil di-seed.');
  }

  // Pastikan selalu ada thread terbuka / belum terjawab untuk interaksi awal
  const currentThreads = await QnaThread.find({ session_id: sessionId });
  const hasOpenThread = currentThreads.some((t) => t.status === 'open' || (!t.answers || t.answers.length === 0));

  if (!hasOpenThread) {
    // Thread 3: Pertanyaan Kuesioner Bersyarat (BELUM TERJAWAB / OPEN)
    await QnaThread.create({
      session_id: sessionId,
      question: {
        content: 'Pemetaan Fasilitas Sanitasi & Ketersediaan Air Bersih Posko Mandiri',
        author: 'Kader Kesehatan Desa',
        is_anon: false,
        response_type: 'structured',
        fields: [
          {
            field_id: 'q1_air',
            type: 'radio',
            label: 'Apakah posko pengungsian Anda memiliki akses air bersih yang cukup?',
            options: ['Ya, Cukup', 'Terbatas (Perlu Bantuan)', 'Sama Sekali Tidak Ada'],
            required: true,
            order: 1,
            logic: null
          },
          {
            field_id: 'q2_tangki',
            type: 'short_text',
            label: 'Berapa tangki air bersih yang dibutuhkan per hari?',
            required: true,
            order: 2,
            logic: {
              parent_id: 'q1_air',
              operator: 'not_equals',
              trigger_value: 'Ya, Cukup',
              action: 'show'
            }
          },
          {
            field_id: 'q3_foto_tandon',
            type: 'file',
            label: 'Unggah foto kondisi tandon penampungan saat ini (JPG/PNG max 2MB):',
            required: false,
            order: 3,
            logic: {
              parent_id: 'q1_air',
              operator: 'not_equals',
              trigger_value: 'Ya, Cukup',
              action: 'show'
            }
          }
        ],
        submitted_at: new Date(Date.now() - 4 * 60 * 1000)
      },
      upvotes: ['demo_fp_02'],
      answers: [],
      status: 'open'
    });

    // Thread 4: Pertanyaan Teks Bebas (BELUM TERJAWAB / OPEN)
    await QnaThread.create({
      session_id: sessionId,
      question: {
        content: 'Apakah relawan mandiri dari luar daerah wajib registrasi ulang di Posko Induk sebelum ke lapangan?',
        author: 'Relawan Nusantara',
        is_anon: false,
        response_type: 'free_text',
        fields: [],
        submitted_at: new Date(Date.now() - 2 * 60 * 1000)
      },
      upvotes: ['demo_fp_01', 'demo_fp_03'],
      answers: [],
      status: 'open'
    });

    console.log('✅ Contoh pertanyaan terbuka (belum terjawab) berhasil di-seed.');
    }
    await Session.findOneAndUpdate({ session_id: sessionId }, { $set: { initial_seeded: true } });
  }

  console.log('🎉 Seeding database selesai dengan sukses!');
}

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch((err) => {
    console.error('Error saat seeding:', err);
    process.exit(1);
  });
}

module.exports = { runSeed };
