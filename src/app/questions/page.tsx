import Link from "next/link";
import { redirect } from "next/navigation";

import { getConversationSummaries } from "@/features/questions/actions";
import { QuestionsChatView } from "@/features/questions/components/questions-chat-view";
import type { QuestionFilter } from "@/features/questions/constants";
import { getSessionContext } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";

type QuestionsPageProps = {
  searchParams: Promise<{ status?: string; id?: string }>;
};

function normalizeFilter(status: string | undefined): QuestionFilter {
  if (
    status === "new" ||
    status === "progress" ||
    status === "answered" ||
    status === "unread"
  ) {
    return status;
  }

  return "all";
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const userIsAdmin = session.isAdmin;
  const activeFilter = userIsAdmin ? normalizeFilter(params.status) : "all";
  const conversations = await getConversationSummaries(
    userIsAdmin ? activeFilter : undefined,
    { userIsAdmin },
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Запитання</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {userIsAdmin
                ? "Чати зі співробітниками: відповіді, статуси та історія повідомлень."
                : "Ваші звернення до адміністратора в форматі чату."}
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0">
            <Link href="/dashboard" prefetch>
              На головну
            </Link>
          </Button>
        </div>

        <QuestionsChatView
          initialConversations={conversations}
          isAdmin={userIsAdmin}
          currentUserId={session.user.id}
          activeFilter={activeFilter}
          initialQuestionId={params.id ?? null}
        />
      </div>
    </main>
  );
}
