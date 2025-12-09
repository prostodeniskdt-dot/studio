import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { mockInventorySessions } from "@/lib/data";

export default function DashboardPage() {
  // In a real app, this data would be fetched from Firestore
  const sessions = mockInventorySessions;

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Сессии инвентаризации</h1>
        <Button>
          <PlusCircle />
          Создать сессию
        </Button>
      </div>
      <SessionsList sessions={sessions} />
    </div>
  );
}
