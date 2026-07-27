import { redirect } from "next/navigation";

import { getAnnouncements } from "@/features/announcements/actions";
import { AnnouncementsView } from "@/features/announcements/components/announcements-view";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";

export default async function AnnouncementsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const [announcements, userIsAdmin] = await Promise.all([
    getAnnouncements(),
    isAdmin(user.id),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Оголошення</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {userIsAdmin
                ? "Створення та керування оголошеннями для співробітників."
                : "Актуальні новини та повідомлення компанії."}
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0">
            <a href="/dashboard">На dashboard</a>
          </Button>
        </div>

        <AnnouncementsView announcements={announcements} isAdmin={userIsAdmin} />
      </div>
    </main>
  );
}
