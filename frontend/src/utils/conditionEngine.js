/**
 * Mesin Evaluasi Logika Kondisional Sisi Klien (Reactive Form Engine)
 * Sesuai Spesifikasi TDD v2.0 Sec 3
 */

export function evaluateCondition(parentAnswer, rule) {
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
    case 'equals': {
      const pStr = String(parentAnswer).trim().toLowerCase();
      const tStr = String(triggerVal).trim().toLowerCase();
      if (tStr === 'lainnya') {
        return pStr === 'lainnya' || pStr.startsWith('lainnya:');
      }
      return pStr === tStr;
    }

    case 'not_equals': {
      const pStr = String(parentAnswer).trim().toLowerCase();
      const tStr = String(triggerVal).trim().toLowerCase();
      if (tStr === 'lainnya') {
        return pStr !== 'lainnya' && !pStr.startsWith('lainnya:');
      }
      return pStr !== tStr;
    }

    case 'contains':
      if (Array.isArray(parentAnswer)) {
        const tStr = String(triggerVal).trim().toLowerCase();
        if (tStr === 'lainnya') {
          return parentAnswer.some((p) => {
            const s = String(p).trim().toLowerCase();
            return s === 'lainnya' || s.startsWith('lainnya:');
          });
        }
        if (Array.isArray(triggerVal)) {
          return triggerVal.some((v) => parentAnswer.map((p) => String(p).trim().toLowerCase()).includes(String(v).trim().toLowerCase()));
        }
        return parentAnswer.map((p) => String(p).trim().toLowerCase()).includes(tStr);
      }
      return String(parentAnswer).toLowerCase().includes(String(triggerVal).toLowerCase());

    case 'all_selected':
      if (Array.isArray(parentAnswer) && Array.isArray(triggerVal)) {
        const lowerAnswers = parentAnswer.map((p) => String(p).trim().toLowerCase());
        return triggerVal.every((val) => lowerAnswers.includes(String(val).trim().toLowerCase()));
      }
      return false;

    default:
      return false;
  }
}

export function isFieldVisible(field, allAnswers = {}) {
  if (!field.logic || !field.logic.parent_id) {
    return true; // Tidak memiliki aturan pemicu (selalu muncul)
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

