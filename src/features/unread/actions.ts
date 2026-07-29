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

export async function markQuestionAnswerRead(questionId: string): Promise<MarkReadResult> {
  const employee = await requireEmployeeUser();

  if (!employee) {
    return { success: false, error: "Недоступно." };
  }

  if (!questionId) {
    return { success: false, error: "Запитання не знайдено." };
  }

  const supabase = await createClient();

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .eq("user_id", employee.user.id)
    .eq("status", "answered")
    .maybeSingle();

  if (questionError || !question) {
    return { success: false, error: "Запитання не знайдено." };
  }

  const { error } = await supabase.from("question_answer_reads").upsert(
    {
      user_id: employee.user.id,
      question_id: questionId,
      read_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,question_id" },
  );

  if (error) {
    console.error("Failed to mark question answer read:", error.message);
    return { success: false, error: "Не вдалося позначити відповідь прочитаною." };
  }

  revalidateEmployeeBadgePaths(["/questions", "/dashboard"]);

  return { success: true };
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

  revalidateEmployeeBadgePaths(["/price", "/dashboard"]);

  return { success: true };
}
