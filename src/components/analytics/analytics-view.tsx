'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { SectionHeader } from '@/components/ui/section-header';
import { HelpIcon } from '@/components/ui/help-icon';
import { SessionComparison } from './session-comparison';

export function AnalyticsView({ data }: { data: SessionWithLines[] }) {
    return (
        <>
            <SectionHeader
                title="Аналитика"
                description="Сравните данные по инвентаризациям для анализа динамики остатков."
            />

            <div className="mb-4 flex items-center gap-2">
                <HelpIcon 
                    description="Выберите несколько завершенных инвентаризаций для сравнения и анализа динамики остатков."
                />
                <span className="text-sm text-muted-foreground">Подсказка: наведите на иконку лампочки</span>
            </div>

            <SessionComparison sessions={data} />
        </>
    )
}
