'use client';

import Link from "next/link";
import type { InventorySession } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <Card key={session.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{session.name}</CardTitle>
              <Badge variant={getStatusVariant(session.status)} className="capitalize">
                {session.status.replace('_', ' ')}
              </Badge>
            </div>
            <CardDescription>
              Created on {session.createdAt.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <div className="flex-grow" />
          <CardFooter>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href={`/dashboard/sessions/${session.id}`}>
                {session.status === 'in_progress' ? 'Continue' : 'View'} Session
                <ArrowRight className="ml-auto" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
