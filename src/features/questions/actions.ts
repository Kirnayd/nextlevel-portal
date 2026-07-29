"use server";

import { revalidatePath } from "next/cache";

import {
  ANSWER_MESSAGE_MAX_LENGTH,
  QUESTION_MESSAGE_MAX_LENGTH,
  QUESTION_SUBJECT_MAX_LENGTH,
  type QuestionFilter,
} from "@/features/questions/constants";
import { notifyQuestionAnswered } from "@/infrastructure/push/triggers";
import { createAdminClient } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import type { Enums, Tables, TablesInsert } from "@/shared/types/database.types";

export type Question = Tables<"questions">;
export type Answer = Tables<"answers">;

export type QuestionAuthor = {
  email: string | null;
  full_name: string | null;
};

export type QuestionWithAnswer = Question & {
  answer: Answer | null;
  author: QuestionAuthor | null;
};

type ActionResult =
  | { success: true; pushWarning?: string }
  | { success: false; error: string };

type RawQuestionRow = Question & {
  answers: Answer[] | null;
};

function normalizeFilter(filter: string | undefined): QuestionFilter {
  if (filter === "new" || filter === "progress" || filter === "answered") {
    return filter;
  }

  return "all";
}

function mapQuestionsWithAnswers(
  rows: RawQuestionRow[],
  authorsById: Map<string, QuestionAuthor>,
): QuestionWithAnswer[] {
  return rows.map((row) => {
    const { answers, ...question } = row;
    const answer = answers?.[0] ?? null;

    return {
      ...question,
      answer,
      author: authorsById.get(question.user_id) ?? null,
    };
  });
}

async function loadAuthors(userIds: string[]): Promise<Map<string, QuestionAuthor>> {
  const authorsById = new Map<string, QuestionAuthor>();

  if (userIds.length === 0) {
    return authorsById;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  if (error) {
    console.error("Failed to load question authors:", error.message);
    return authorsById;
  }

  for (const profile of (data ?? []) as Array<
    QuestionAuthor & { id: string }
  >) {
    authorsById.set(profile.id, {
      email: profile.email,
      full_name: profile.full_name,
    });
  }

  return authorsById;
}

export async function getQuestions(
  filterParam?: string,
  options?: { userIsAdmin?: boolean },
): Promise<QuestionWithAnswer[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const userIsAdmin = options?.userIsAdmin ?? (await isAdmin(user.id));
  const filter = normalizeFilter(filterParam);

  let query = supabase
    .from("questions")
    .select("*, answers(*)")
    .order("created_at", { ascending: false });

  if (!userIsAdmin) {
    query = query.eq("user_id", user.id);
  } else if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load questions:", error.message);
    return [];
  }

  const rows = (data ?? []) as RawQuestionRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const authorsById = userIsAdmin ? await loadAuthors(userIds) : new Map();

  return mapQuestionsWithAnswers(rows, authorsById);
}

function validateQuestionInput(subject: string, message: string): string | null {
  if (!subject.trim()) {
    return "Вкажіть тему запитання.";
  }

  if (!message.trim()) {
    return "Вкажіть текст запитання.";
  }

  if (subject.trim().length > QUESTION_SUBJECT_MAX_LENGTH) {
    return `Тема не може перевищувати ${QUESTION_SUBJECT_MAX_LENGTH} символів.`;
  }

  if (message.trim().length > QUESTION_MESSAGE_MAX_LENGTH) {
    return `Текст не може перевищувати ${QUESTION_MESSAGE_MAX_LENGTH} символів.`;
  }

  return null;
}

export async function createQuestion(formData: FormData): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему, щоб поставити запитання." };
  }

  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "");
  const validationError = validateQuestionInput(subject, message);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();

  const insertPayload: TablesInsert<"questions"> = {
    user_id: user.id,
    subject: subject.trim(),
    message: message.trim(),
    status: "new",
  };

  const { error } = await supabase.from("questions").insert(insertPayload as never);

  if (error) {
    console.error("Failed to create question:", error.message);
    return { success: false, error: "Не вдалося надіслати запитання. Спробуйте ще раз." };
  }

  revalidatePath("/questions");

  return { success: true };
}

export async function takeQuestionInProgress(questionId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може змінювати статус." };
  }

  if (!questionId) {
    return { success: false, error: "Запитання не знайдено." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("questions")
    .update({ status: "progress" satisfies Enums<"question_status"> } as never)
    .eq("id", questionId)
    .neq("status", "answered");

  if (error) {
    console.error("Failed to update question status:", error.message);
    return { success: false, error: "Не вдалося оновити статус запитання." };
  }

  revalidatePath("/questions");

  return { success: true };
}

export async function submitAnswer(
  questionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може відповідати на запитання." };
  }

  if (!questionId) {
    return { success: false, error: "Запитання не знайдено." };
  }

  const message = String(formData.get("message") ?? "").trim();

  if (!message) {
    return { success: false, error: "Вкажіть текст відповіді." };
  }

  if (message.length > ANSWER_MESSAGE_MAX_LENGTH) {
    return {
      success: false,
      error: `Відповідь не може перевищувати ${ANSWER_MESSAGE_MAX_LENGTH} символів.`,
    };
  }

  const supabase = await createClient();

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("user_id, subject")
    .eq("id", questionId)
    .maybeSingle();

  if (questionError || !question) {
    return { success: false, error: "Запитання не знайдено." };
  }

  const { data: existingAnswer, error: existingAnswerError } = await supabase
    .from("answers")
    .select("id")
    .eq("question_id", questionId)
    .maybeSingle();

  if (existingAnswerError) {
    console.error("Failed to check existing answer:", existingAnswerError.message);
    return { success: false, error: "Не вдалося перевірити наявність відповіді." };
  }

  if (existingAnswer) {
    return { success: false, error: "На це запитання вже надано відповідь." };
  }

  const answerPayload: TablesInsert<"answers"> = {
    question_id: questionId,
    admin_id: user.id,
    message,
  };

  const { data: savedAnswer, error: answerError } = await supabase
    .from("answers")
    .insert(answerPayload as never)
    .select("id")
    .single();

  if (answerError || !savedAnswer) {
    console.error("Failed to save answer:", answerError?.message);
    return { success: false, error: "Не вдалося зберегти відповідь." };
  }

  const { error: statusError } = await supabase
    .from("questions")
    .update({ status: "answered" satisfies Enums<"question_status"> } as never)
    .eq("id", questionId);

  if (statusError) {
    console.error("Failed to update question status after answer:", statusError.message);
    return { success: false, error: "Відповідь збережено, але не вдалося оновити статус." };
  }

  revalidatePath("/questions");

  let pushWarning: string | undefined;

  try {
    pushWarning = await notifyQuestionAnswered(
      (savedAnswer as { id: string }).id,
      (question as { user_id: string; subject: string }).user_id,
      (question as { user_id: string; subject: string }).subject,
    );
  } catch (error) {
    console.error("Question answer push notification failed:", error);
  }

  return { success: true, pushWarning };
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може видаляти запитання." };
  }

  if (!questionId) {
    return { success: false, error: "Запитання не знайдено." };
  }

  const admin = createAdminClient();

  const { error: answerError } = await admin.from("answers").delete().eq("question_id", questionId);

  if (answerError) {
    console.error("Failed to delete question answers:", answerError.message);
    return { success: false, error: "Не вдалося видалити запитання." };
  }

  const { error: questionError } = await admin.from("questions").delete().eq("id", questionId);

  if (questionError) {
    console.error("Failed to delete question:", questionError.message);
    return { success: false, error: "Не вдалося видалити запитання." };
  }

  revalidatePath("/questions");

  return { success: true };
}
