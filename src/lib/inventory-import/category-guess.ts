import type { ProductCategory } from '@/lib/types';
import { normalizeForMatch } from './normalize';

export function guessCategoryFromText(group: string, name: string): ProductCategory {
  const s = normalizeForMatch(`${group} ${name}`);
  const pick = (...keys: string[]) => keys.some((k) => s.includes(normalizeForMatch(k)));

  if (pick('виски', 'whiskey', 'bourbon', 'scotch')) return 'Whiskey';
  if (pick('ром ', 'ром', 'rhum')) return 'Rum';
  if (pick('водка')) return 'Vodka';
  if (pick('джин')) return 'Gin';
  if (pick('текила', 'tequila')) return 'Tequila';
  if (pick('ликер', 'лікёр', 'liqueur')) return 'Liqueur';
  if (pick('абсент', 'absinthe')) return 'Absinthe';
  if (pick('вино ', 'wine', ' шампан', 'игрист')) return 'Wine';
  if (pick('пиво', 'beer')) return 'Beer';
  if (pick('сироп', 'сиров')) return 'Syrup';
  if (pick('коньяк', 'арманьяк', 'кальвадос', 'бренди')) return 'Brandy';
  if (pick('вермут', 'vermouth')) return 'Vermouth';
  if (pick('биттер', 'bitter')) return 'Bitters';

  return 'Other';
}
