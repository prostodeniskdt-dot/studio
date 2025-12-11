import type { Holiday } from './types';

// Source: https://www.consultant.ru/law/ref/calendar/proizvodstvennyi/2024/
export const russianHolidays2024: Holiday[] = [
  // Новогодние каникулы
  { date: '2024-01-01', name: 'Новый год' },
  { date: '2024-01-02', name: 'Новогодние каникулы' },
  { date: '2024-01-03', name: 'Новогодние каникулы' },
  { date: '2024-01-04', name: 'Новогодние каникулы' },
  { date: '2024-01-05', name: 'Новогодние каникулы' },
  { date: '2024-01-06', name: 'Новогодние каникулы' },
  { date: '2024-01-07', name: 'Рождество Христово' },
  { date: '2024-01-08', name: 'Новогодние каникулы' },
  // День защитника Отечества
  { date: '2024-02-23', name: 'День защитника Отечества' },
  // Международный женский день
  { date: '2024-03-08', name: 'Международный женский день' },
  // Праздник Весны и Труда
  { date: '2024-04-29', name: 'Перенесенный выходной' },
  { date: '2024-04-30', name: 'Перенесенный выходной' },
  { date: '2024-05-01', name: 'Праздник Весны и Труда' },
  // День Победы
  { date: '2024-05-09', name: 'День Победы' },
  { date: '2024-05-10', name: 'Перенесенный выходной' },
  // День России
  { date: '2024-06-12', name: 'День России' },
  // День народного единства
  { date: '2024-11-03', name: 'Выходной (предпраздничный)' },
  { date: '2024-11-04', name: 'День народного единства' },
  // Новый год
  { date: '2024-12-29', name: 'Перенесенный выходной' },
  { date: '2024-12-30', name: 'Перенесенный выходной' },
  { date: '2024-12-31', name: 'Новый год' },
];

/**
 * Checks if a date is near an upcoming holiday.
 * @param checkDate The date to check.
 * @param holidays A list of holidays.
 * @param daysBefore The number of days before a holiday to consider "near".
 * @returns The name of the holiday if it's upcoming, otherwise null.
 */
export function getUpcomingHoliday(checkDate: Date, holidays: Holiday[], daysBefore: number = 3): string | null {
    for (const holiday of holidays) {
        const holidayDate = new Date(holiday.date);
        // Set hours to 0 to compare dates only
        holidayDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);

        const diffTime = holidayDate.getTime() - checkDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Is the holiday in the future and within the 'daysBefore' window?
        if (diffDays >= 0 && diffDays <= daysBefore) {
            return holiday.name;
        }
    }
    return null;
}
