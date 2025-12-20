'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { SectionHeader } from '@/components/ui/section-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SessionComparison } from './session-comparison';

export function AnalyticsView({ data }: { data: SessionWithLines[] }) {
    return (
        <>
            <SectionHeader
                title="Аналитика"
                description="Сравните данные по инвентаризациям для анализа динамики остатков."
            />

            <Alert variant="default" className="mb-4">
                <AlertTitle>Как пользоваться</AlertTitle>
                <AlertDescription>
                    Выберите несколько завершенных инвентаризаций для сравнения и анализа динамики остатков.
                </AlertDescription>
            </Alert>

            <SessionComparison sessions={data} />
        </>
    )
}
