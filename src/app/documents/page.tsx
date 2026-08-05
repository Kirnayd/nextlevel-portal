import Link from "next/link";
import { redirect } from "next/navigation";

import { getDocumentCategoriesWithDocuments } from "@/features/documents/actions";
import { DocumentsView } from "@/features/documents/components/documents-view";
import { getCategoryDocumentCount } from "@/features/documents/lib/category-helpers";
import { getSessionContext } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";

export default async function DocumentsPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const role = session.role;
  const userIsAdmin = role === "admin";
  const categories = await getDocumentCategoriesWithDocuments();

  if (process.env.NODE_ENV === "development") {
    console.info("[documents-page]", {
      userId: session.user.id,
      role,
      isAdmin: userIsAdmin,
      categoriesLoaded: categories.length,
      subcategoriesLoaded: categories.reduce(
        (sum, category) => sum + category.subcategories.length,
        0,
      ),
      documentsLoaded: categories.reduce(
        (sum, category) => sum + getCategoryDocumentCount(category),
        0,
      ),
      emptyFilterApplied: false,
      categorySummary: categories.map((category) => ({
        id: category.id,
        name: category.name,
        subcategoryCount: category.subcategories.length,
        documentCount: getCategoryDocumentCount(category),
      })),
    });
  }

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
            <Link href="/dashboard" prefetch>
              На головну
            </Link>
          </Button>
        </div>

        <DocumentsView categories={categories} isAdmin={userIsAdmin} role={role} />
      </div>
    </main>
  );
}
