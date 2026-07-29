import Link from "next/link";
import { redirect } from "next/navigation";

import { PushNotificationSettings } from "@/shared/components/pwa/push-notification-settings";
import { getSessionContext } from "@/shared/lib/auth";

export default async function DashboardPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const { user, isAdmin: userIsAdmin } = session;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-8">
        <h1 className="text-3xl font-bold">
          Головна
        </h1>

        <p className="mt-4">
          Ви увійшли як:
        </p>

        <p className="font-semibold">
          {user.email}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/announcements"
            prefetch
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Оголошення
          </Link>
          <Link
            href="/price"
            prefetch
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Прайс
          </Link>
          <Link
            href="/documents"
            prefetch
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Документи
          </Link>
          <Link
            href="/questions"
            prefetch
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Запитання
          </Link>
          {userIsAdmin ? (
            <Link
              href="/users"
              prefetch
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Користувачі
            </Link>
          ) : null}
        </div>

        <PushNotificationSettings />

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
