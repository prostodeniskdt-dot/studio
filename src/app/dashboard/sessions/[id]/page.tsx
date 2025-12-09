import { mockInventorySessions, mockProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Link from "next/link";

export default function SessionPage({ params }: { params: { id: string } }) {
  // In a real app, this data would be fetched from Firestore
  const session = mockInventorySessions.find(s => s.id === params.id);
  const products = mockProducts;

  if (!session) {
    notFound();
  }

  const getStatusVariant = (status: (typeof session.status)) => {
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
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
            <p className="text-muted-foreground">
                Created on {session.createdAt.toLocaleDateString()}
            </p>
        </div>
        <div className="flex items-center gap-4">
            <Badge variant={getStatusVariant(session.status)} className="capitalize text-base px-3 py-1">
                {session.status.replace('_', ' ')}
            </Badge>
            {session.status === 'completed' && (
                <Button asChild>
                    <Link href={`/dashboard/sessions/${session.id}/report`}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Report
                    </Link>
                </Button>
            )}
        </div>
      </div>
      <InventoryTable session={session} products={products} />
    </div>
  );
}
