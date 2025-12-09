'use client';

import Link from "next/link";
import type { InventorySession } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, translateStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Timestamp } from "firebase/firestore";

type SessionsListProps = {
  sessions: InventorySession[];
};

export function SessionsList({ sessions }: SessionsListProps) {
  const getStatusVariant = (status: InventorySession['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'Неверная дата';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ru-RU');
    }
    // Fallback for cases where it might already be a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('ru-RU');
    }
    return 'Неверная дата';
  }


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <Card key={session.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{session.name}</CardTitle>
              <Badge variant={getStatusVariant(session.status)} className="capitalize">
                {translateStatus(session.status)}
              </Badge>
            </div>
            <CardDescription>
              Создано {formatDate(session.createdAt)}
            </CardDescription>
          </CardHeader>
          <div className="flex-grow" />
          <CardFooter>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href={`/dashboard/sessions/${session.id}`}>
                {session.status === 'in_progress' ? 'Продолжить' : 'Смотреть'} сессию
                <ArrowRight className="ml-auto" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
