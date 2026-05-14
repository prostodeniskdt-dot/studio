'use client';

import { useEffect, useState } from 'react';

export function LocalizedDate({ date }: { date: Date }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // Эта функция будет выполняться только на клиенте после гидратации,
    // гарантируя, что локаль браузера будет использована для форматирования.
    setFormattedDate(new Date(date).toLocaleDateString());
  }, [date]);

  if (!formattedDate) {
    // Можно показать заглушку, пока дата не отформатирована на клиенте
    // но для простоты мы вернем пустую строку, чтобы избежать скачков контента.
    return null;
  }

  return <>{formattedDate}</>;
}
