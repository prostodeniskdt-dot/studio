import { mockInventorySessions, mockProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/reports/report-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function SessionReportPage({ params }: { params: { id: string } }) {
  // In a real app, this data would be fetched from Firestore
  const session = mockInventorySessions.find(s => s.id === params.id);
  const products = mockProducts;

  if (!session) {
    notFound();
  }

  if (session.status !== 'completed') {
    return (
        <div className="container mx-auto flex items-center justify-center h-full">
            <Alert className="max-w-md">
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>Report Not Available</AlertTitle>
                <AlertDescription>
                    This inventory session is not yet completed. Please complete the session to view the report.
                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                        <Link href={`/dashboard/sessions/${session.id}`}>Go back to session</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    )
  }


  return (
    <div className="container mx-auto">
      <ReportView session={session} products={products} />
    </div>
  );
}
