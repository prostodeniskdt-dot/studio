export type CalculationMethod = 'weight';

export type CalculateVolumeInput = {
  bottleVolumeMl: number;
  fullBottleWeightG?: number | null;
  emptyBottleWeightG?: number | null;
  currentWeightG?: number | null;
  /** Если задано конечное число > 0, объём квантуется к этому шагу (мл). Иначе — без округления. */
  roundingStepMl?: number;
};

export type CalculateVolumeResult =
  | {
      ok: true;
      volumeMl: number;
      method: CalculationMethod;
      roundingStepMl: number;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
    };

function isFinitePositiveNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Небольшой положительный сдвиг объёма (мл); не показываем в интерфейсе — компенсирует характерную недооценку по весу. */
export const CALCULATOR_VOLUME_BIAS_ML = 20;

/** Читаемый вывод объёма (до 1 знака); для отправки используйте исходное число миллилитров. */
export function formatVolumeMlForDisplay(ml: number): string {
  if (!Number.isFinite(ml)) return '—';
  const quantized = Math.round(ml * 10) / 10;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(quantized);
}

export function calculateVolumeMl(input: CalculateVolumeInput): CalculateVolumeResult {
  const stepInput = input.roundingStepMl;
  const useRounding = isFinitePositiveNumber(stepInput);
  const roundingStepMl = useRounding ? stepInput : 0;

  if (!isFinitePositiveNumber(input.bottleVolumeMl)) {
    return { ok: false, errors: ['Номинальный объем бутылки должен быть положительным числом.'] };
  }

  const bv = input.bottleVolumeMl;
  const fw = input.fullBottleWeightG ?? undefined;
  const ew = input.emptyBottleWeightG ?? undefined;
  const cw = input.currentWeightG ?? undefined;

  const warnings: string[] = [];

  const canWeight =
    typeof fw === 'number' &&
    typeof ew === 'number' &&
    typeof cw === 'number' &&
    Number.isFinite(fw) &&
    Number.isFinite(ew) &&
    Number.isFinite(cw) &&
    fw > ew &&
    cw >= ew;

  if (canWeight) {
    const liquidNetWeight = fw - ew;
    const currentLiquidWeight = cw - ew;

    if (liquidNetWeight <= 0) {
      return { ok: false, errors: ['Некорректный профиль бутылки: вес полной должен быть больше веса пустой.'] };
    }

    if (cw > fw) warnings.push('Текущий вес больше веса полной бутылки — проверьте замер или профиль.');

    const raw = (currentLiquidWeight / liquidNetWeight) * bv;
    const clamped = clamp(raw, 0, bv);
    const stepped = useRounding ? clamp(roundToStep(clamped, stepInput), 0, bv) : clamped;
    const volumeMl = clamp(stepped + CALCULATOR_VOLUME_BIAS_ML, 0, bv);

    return { ok: true, volumeMl, method: 'weight', roundingStepMl, warnings };
  }

  const errors: string[] = [];
  if (!(typeof cw === 'number' && Number.isFinite(cw))) errors.push('Введите текущий вес.');
  if (!(typeof fw === 'number' && Number.isFinite(fw))) errors.push('Не задан вес полной бутылки в профиле продукта.');
  if (!(typeof ew === 'number' && Number.isFinite(ew))) errors.push('Не задан вес пустой бутылки в профиле продукта.');
  return { ok: false, errors };
}

