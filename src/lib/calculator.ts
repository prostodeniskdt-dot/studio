export type CalculationMethod = 'weight';

export type CalculateVolumeInput = {
  bottleVolumeMl: number;
  fullBottleWeightG?: number | null;
  emptyBottleWeightG?: number | null;
  currentWeightG?: number | null;
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

  const errors: string[] = [];
  if (!(typeof cw === 'number' && Number.isFinite(cw))) errors.push('Введите текущий вес.');
  if (!(typeof fw === 'number' && Number.isFinite(fw))) errors.push('Не задан вес полной бутылки в профиле продукта.');
  if (!(typeof ew === 'number' && Number.isFinite(ew))) errors.push('Не задан вес пустой бутылки в профиле продукта.');
  return { ok: false, errors };
}

