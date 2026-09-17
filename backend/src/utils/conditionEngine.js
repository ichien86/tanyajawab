/**
 * Mesin Evaluasi Logika Kondisional (Conditional Logic Engine)
 * Sesuai Spesifikasi TDD v2.0
 */

/**
 * Mengevaluasi apakah suatu kondisi terpenuhi berdasarkan jawaban parent
 * @param {*} parentAnswer - Jawaban dari pertanyaan induk (bisa string, array untuk checkbox, dll)
 * @param {Object} rule - Aturan logika kondisional
 * @param {string} rule.parent_id - ID pertanyaan induk
 * @param {('equals'|'not_equals'|'contains'|'all_selected')} rule.operator - Operator perbandingan
 * @param {string|string[]} rule.trigger_value - Nilai pemicu
 * @param {('show'|'hide'|'require'|'skip_to')} rule.action - Aksi jika kondisi terpenuhi
 * @returns {boolean}
 */
function evaluateCondition(parentAnswer, rule) {
  if (!rule || !rule.parent_id) return true;

  const isFilled = parentAnswer !== undefined &&
    parentAnswer !== null &&
    String(parentAnswer).trim() !== '' &&
    (!Array.isArray(parentAnswer) || parentAnswer.length > 0);

  if (rule.operator === 'filled' || rule.operator === 'not_empty') {
    return isFilled;
  }

  if (rule.operator === 'empty') {
    return !isFilled;
  }

  if (!isFilled) return false;

  const triggerVal = rule.trigger_value;

  switch (rule.operator) {
    case 'equals':
      return String(parentAnswer).trim().toLowerCase() === String(triggerVal).trim().toLowerCase();

    case 'not_equals':
      return String(parentAnswer).trim().toLowerCase() !== String(triggerVal).trim().toLowerCase();

    case 'contains':
      // Cocok untuk tipe checkbox (array) atau substring text
      if (Array.isArray(parentAnswer)) {
        if (Array.isArray(triggerVal)) {
          return triggerVal.some((v) => parentAnswer.map((p) => String(p).trim().toLowerCase()).includes(String(v).trim().toLowerCase()));
        }
        return parentAnswer.map((p) => String(p).trim().toLowerCase()).includes(String(triggerVal).trim().toLowerCase());
      }
      return String(parentAnswer).toLowerCase().includes(String(triggerVal).toLowerCase());

    case 'all_selected':
      // Semua opsi di trigger_value harus ada di dalam jawaban checkbox peserta
      if (Array.isArray(parentAnswer) && Array.isArray(triggerVal)) {
        const lowerAnswers = parentAnswer.map((p) => String(p).trim().toLowerCase());
        return triggerVal.every((val) => lowerAnswers.includes(String(val).trim().toLowerCase()));
      }
      return false;

    default:
      return false;
  }
}

/**
 * Menentukan visibilitas suatu field berdasarkan jawaban formulir saat ini
 * @param {Object} field - Definisi field
 * @param {Object} allAnswers - Objek pasangan { [field_id]: value }
 * @returns {boolean} True jika field harus ditampilkan
 */
function isFieldVisible(field, allAnswers = {}) {
  if (!field.logic || !field.logic.parent_id) {
    return true; // Tidak memiliki ketergantungan (selalu tampil)
  }

  const parentAnswer = allAnswers[field.logic.parent_id];
  const isConditionMet = evaluateCondition(parentAnswer, field.logic);

  if (field.logic.action === 'show') {
    return isConditionMet;
  } else if (field.logic.action === 'hide') {
    return !isConditionMet;
  }

  return true;
}

module.exports = {
  evaluateCondition,
  isFieldVisible
};

