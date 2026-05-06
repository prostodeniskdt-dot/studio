export type CalculationMethod = 'weight' | 'height';

export type CalculateVolumeInput = {
  bottleVolumeMl: number;
  fullBottleWeightG?: number | null;
  emptyBottleWeightG?: number | null;
  currentWeightG?: number | null;
  liquidLevelCm?: number | null;
  fullLiquidHeightCm?: number | null;
  roundingStepMl?: number; // default 10
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
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(step) || step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function calculateVolumeMl(input: CalculateVolumeInput): CalculateVolumeResult {
  const roundingStepMl = isFinitePositiveNumber(input.roundingStepMl) ? input.roundingStepMl : 10;

  if (!isFinitePositiveNumber(input.bottleVolumeMl)) {
    return { ok: false, errors: ['Номинальный объем бутылки должен быть положительным числом.'] };
  }

  const bv = input.bottleVolumeMl;
  const fw = input.fullBottleWeightG ?? undefined;
  const ew = input.emptyBottleWeightG ?? undefined;
  const cw = input.currentWeightG ?? undefined;
  const ll = input.liquidLevelCm ?? undefined;
  const fullH = input.fullLiquidHeightCm ?? undefined;

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
    const rounded = clamp(roundToStep(clamped, roundingStepMl), 0, bv);

    return { ok: true, volumeMl: rounded, method: 'weight', roundingStepMl, warnings };
  }

  // Fallback: height-based (only when weight profile isn't available)
  const heightOk =
    typeof ll === 'number' && Number.isFinite(ll) && ll > 0 && (typeof fullH !== 'number' || !Number.isFinite(fullH) || fullH <= 0 || fullH > 0);

  if (!heightOk) {
    const errors: string[] = [];
    if (!(typeof cw === 'number' && Number.isFinite(cw))) errors.push('Введите текущий вес.');
    if (!(typeof fw === 'number' && Number.isFinite(fw))) errors.push('Не задан вес полной бутылки в профиле продукта.');
    if (!(typeof ew === 'number' && Number.isFinite(ew))) errors.push('Не задан вес пустой бутылки в профиле продукта.');
    if (!(typeof ll === 'number' && Number.isFinite(ll) && ll > 0)) errors.push('Для резервного расчета заполните уровень жидкости (см).');
    return { ok: false, errors };
  }

  const fallbackFullH = isFinitePositiveNumber(fullH) ? fullH : 25;
  if (!isFinitePositiveNumber(fullH)) warnings.push('Высота жидкости полной бутылки не задана — используется значение по умолчанию 25 см.');

  const percentage = clamp(ll / fallbackFullH, 0, 1);
  const raw = bv * percentage;
  const rounded = clamp(roundToStep(raw, roundingStepMl), 0, bv);

  return { ok: true, volumeMl: rounded, method: 'height', roundingStepMl, warnings };
}

