import { redirect } from "next/navigation";

import { getDocumentCategoriesWithDocuments } from "@/features/documents/actions";
import { DocumentsView } from "@/features/documents/components/documents-view";
import { getSessionContext } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";

export default async function DocumentsPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const categories = await getDocumentCategoriesWithDocuments();
  const userIsAdmin = session.isAdmin;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Документи</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {userIsAdmin
                ? "Керування категоріями та документами компанії."
                : "Перегляд і завантаження документів компанії."}
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0">
            <a href="/dashboard">На головну</a>
          </Button>
        </div>

        <DocumentsView categories={categories} isAdmin={userIsAdmin} />
      </div>
    </main>
  );
}
