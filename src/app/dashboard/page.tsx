import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/supabase/server";
import { isAdmin } from "@/shared/lib/auth";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userIsAdmin = await isAdmin(user.id);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-8">
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <p className="mt-4">
          Ви увійшли як:
        </p>

        <p className="font-semibold">
          {user.email}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/announcements"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Оголошення
          </a>
          <a
            href="/price"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Прайс
          </a>
          <a
            href="/documents"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Документи
          </a>
          <a
            href="/questions"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Запитання
          </a>
          {userIsAdmin ? (
            <a
              href="/users"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Користувачі
            </a>
          ) : null}
        </div>

        <form action="/api/logout" method="post" className="mt-6">
          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Вийти
          </button>
        </form>
      </div>
    </main>
  );
}