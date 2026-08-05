"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";

type MarkReadResult = { success: true } | { success: false; error: string };

export type EmployeeUnreadCounts = {
  announcements: number;
  questions: number;
  price: number;
};

function revalidateEmployeeBadgePaths(
  paths: Array<"/dashboard" | "/announcements" | "/questions" | "/price">,
): void {
  for (const path of paths) {
    revalidatePath(path);
  }
}

async function requireEmployeeUser(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>> } | null
> {
  const user = await getAuthenticatedUser();

  if (!user || (await isAdmin(user.id))) {
    return null;
  }

  return { user };
}

export async function getEmployeeUnreadCounts(): Promise<EmployeeUnreadCounts> {
  const employee = await requireEmployeeUser();

  if (!employee) {
    return { announcements: 0, questions: 0, price: 0 };
  }

  const supabase = await createClient();

  const [
    { data: announcementsCount, error: announcementsError },
    { data: questionsCount, error: questionsError },
    { data: priceCount, error: priceError },
  ] = await Promise.all([
    supabase.rpc("count_unread_announcements"),
    supabase.rpc("count_unread_question_answers"),
    supabase.rpc("count_unread_price"),
  ]);

  if (announcementsError) {
    console.error("Failed to count unread announcements:", announcementsError.message);
  }

  if (questionsError) {
    console.error("Failed to count unread question answers:", questionsError.message);
  }

  if (priceError) {
    console.error("Failed to count unread price:", priceError.message);
  }

  return {
    announcements: typeof announcementsCount === "number" ? announcementsCount : 0,
    questions: typeof questionsCount === "number" ? questionsCount : 0,
    price: typeof priceCount === "number" ? priceCount : 0,
  };
}

export async function markAnnouncementRead(announcementId: string): Promise<MarkReadResult> {
  const employee = await requireEmployeeUser();

  if (!employee) {
    return { success: false, error: "Недоступно." };
  }

  if (!announcementId) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const supabase = await createClient();

  const { data: announcement, error: announcementError } = await supabase
    .from("announcements")
    .select("id")
    .eq("id", announcementId)
    .eq("is_published", true)
    .maybeSingle();

  if (announcementError || !announcement) {
    return { success: false, error: "Оголошення не знайдено." };
  }

  const { error } = await supabase.from("announcement_reads").upsert(
    {
      user_id: employee.user.id,
      announcement_id: announcementId,
      read_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,announcement_id" },
  );

  if (error) {
    console.error("Failed to mark announcement read:", error.message);
    return { success: false, error: "Не вдалося позначити оголошення прочитаним." };
  }

  revalidateEmployeeBadgePaths(["/announcements", "/dashboard"]);

  return { success: true };
}

export async function markQuestionChatRead(questionId: string): Promise<MarkReadResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Недоступно." };
  }

  if (!questionId) {
    return { success: false, error: "Чат не знайдено." };
  }

  const supabase = await createClient();
  const userIsAdmin = await isAdmin(user.id);

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, user_id")
    .eq("id", questionId)
    .maybeSingle();

  if (questionError || !question) {
    return { success: false, error: "Чат не знайдено." };
  }

  if (!userIsAdmin && (question as { user_id: string }).user_id !== user.id) {
    return { success: false, error: "Немає доступу до цього чату." };
  }

  const { data: latestMessage } = await supabase
    .from("question_messages")
    .select("created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastReadAt =
    (latestMessage as { created_at?: string } | null)?.created_at ?? new Date().toISOString();

  const { error } = await supabase.from("question_chat_reads").upsert(
    {
      question_id: questionId,
      user_id: user.id,
      last_read_at: lastReadAt,
    } as never,
    { onConflict: "question_id,user_id" },
  );

  if (error) {
    console.error("Failed to mark chat read:", error.message);
    return { success: false, error: "Не вдалося позначити чат прочитаним." };
  }

  revalidateEmployeeBadgePaths(["/questions", "/dashboard"]);

  return { success: true };
}

/** @deprecated Prefer markQuestionChatRead */
export async function markQuestionAnswerRead(questionId: string): Promise<MarkReadResult> {
  return markQuestionChatRead(questionId);
}

export async function markPriceRead(fileId: string): Promise<MarkReadResult> {
  const employee = await requireEmployeeUser();

  if (!employee) {
    return { success: false, error: "Недоступно." };
  }

  if (!fileId) {
    return { success: false, error: "Прайс не знайдено." };
  }

  const supabase = await createClient();

  const { data: priceFile, error: priceError } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .eq("category", "price")
    .maybeSingle();

  if (priceError || !priceFile) {
    return { success: false, error: "Прайс не знайдено." };
  }

  const { error } = await supabase.from("price_reads").upsert(
    {
      user_id: employee.user.id,
      file_id: fileId,
      read_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,file_id" },
  );

  if (error) {
    console.error("Failed to mark price read:", error.message);
    return { success: false, error: "Не вдалося позначити прайс переглянутим." };
  }

  revalidateEmployeeBadgePaths(["/dashboard"]);

  return { success: true };
}
