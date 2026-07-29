import { redirect } from "next/navigation";

import { getUsers } from "@/features/users/actions";
import { UsersView } from "@/features/users/components/users-view";
import { getSessionContext } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";

type UsersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  if (!session.isAdmin) {
    redirect("/dashboard");
  }

  const { q = "" } = await searchParams;
  const users = await getUsers(q);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Користувачі</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Керування обліковими записами співробітників та адміністраторів.
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0">
            <a href="/dashboard">На головну</a>
          </Button>
        </div>

        <UsersView users={users} currentUserId={session.user.id} searchQuery={q} />
      </div>
    </main>
  );
}
