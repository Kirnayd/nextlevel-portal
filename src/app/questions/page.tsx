import { redirect } from "next/navigation";

import { getQuestions } from "@/features/questions/actions";
import { EmployeeQuestionPanel } from "@/features/questions/components/employee-question-panel";
import { QuestionList } from "@/features/questions/components/question-list";
import { QuestionStatusFilter } from "@/features/questions/components/question-status-filter";
import type { QuestionFilter } from "@/features/questions/constants";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";

type QuestionsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function normalizeFilter(status: string | undefined): QuestionFilter {
  if (status === "new" || status === "progress" || status === "answered") {
    return status;
  }

  return "all";
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const userIsAdmin = await isAdmin(user.id);
  const activeFilter = userIsAdmin ? normalizeFilter(params.status) : "all";
  const questions = await getQuestions(userIsAdmin ? activeFilter : undefined);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Запитання</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {userIsAdmin
                ? "Перегляд і обробка запитань від співробітників."
                : "Ваші звернення до адміністратора."}
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0">
            <a href="/dashboard">На головну</a>
          </Button>
        </div>

        {userIsAdmin ? <QuestionStatusFilter activeFilter={activeFilter} /> : null}

        {!userIsAdmin ? <EmployeeQuestionPanel /> : null}

        <QuestionList questions={questions} isAdmin={userIsAdmin} />
      </div>
    </main>
  );
}
