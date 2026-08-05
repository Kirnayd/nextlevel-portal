"use server";

import { revalidatePath } from "next/cache";

import {
  CHAT_MESSAGES_PAGE_SIZE,
  QUESTION_MESSAGE_MAX_LENGTH,
  QUESTION_SUBJECT_MAX_LENGTH,
  type QuestionFilter,
} from "@/features/questions/constants";
import {
  notifyEmployeeQuestionMessage,
  notifyAdminsQuestionMessage,
} from "@/infrastructure/push/triggers";
import { createAdminClient } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import type { Enums, Tables, TablesInsert } from "@/shared/types/database.types";

export type Question = Tables<"questions">;
export type QuestionMessage = Tables<"question_messages">;

export type QuestionAuthor = {
  email: string | null;
  full_name: string | null;
};

export type ConversationSummary = {
  id: string;
  user_id: string;
  subject: string;
  status: Enums<"question_status">;
  created_at: string;
  last_message_at: string;
  last_message_by: string | null;
  updated_at: string;
  last_message_preview: string | null;
  unread_count: number;
  author: QuestionAuthor | null;
};

export type ChatMessage = QuestionMessage & {
  is_own: boolean;
  is_admin_sender: boolean;
};

type ActionResult =
  | { success: true; pushWarning?: string; questionId?: string; message?: ChatMessage }
  | { success: false; error: string };

function revalidateQuestionPaths(): void {
  revalidatePath("/questions");
  revalidatePath("/dashboard");
}

function normalizeFilter(filter: string | undefined): QuestionFilter {
  if (
    filter === "new" ||
    filter === "progress" ||
    filter === "answered" ||
    filter === "unread"
  ) {
    return filter;
  }

  return "all";
}

function validateMessageText(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed) {
    return "Вкажіть текст повідомлення.";
  }

  if (trimmed.length > QUESTION_MESSAGE_MAX_LENGTH) {
    return `Повідомлення не може перевищувати ${QUESTION_MESSAGE_MAX_LENGTH} символів.`;
  }

  return null;
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

  for (const profile of (data ?? []) as Array<QuestionAuthor & { id: string }>) {
    authorsById.set(profile.id, {
      email: profile.email,
      full_name: profile.full_name,
    });
  }

  return authorsById;
}

async function loadAdminSenderIds(senderIds: string[]): Promise<Set<string>> {
  const adminIds = new Set<string>();

  if (senderIds.length === 0) {
    return adminIds;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", senderIds)
    .eq("role", "admin");

  if (error) {
    console.error("Failed to load admin senders:", error.message);
    return adminIds;
  }

  for (const profile of (data ?? []) as Array<{ id: string }>) {
    adminIds.add(profile.id);
  }

  return adminIds;
}

export async function getConversationSummaries(
  filterParam?: string,
  options?: { userIsAdmin?: boolean },
): Promise<ConversationSummary[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const userIsAdmin = options?.userIsAdmin ?? (await isAdmin(user.id));
  const filter = normalizeFilter(filterParam);

  let query = supabase
    .from("questions")
    .select(
      "id, user_id, subject, status, created_at, last_message_at, last_message_by, updated_at",
    )
    .order("last_message_at", { ascending: false });

  if (!userIsAdmin) {
    query = query.eq("user_id", user.id);
  } else if (filter !== "all" && filter !== "unread") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load conversations:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    subject: string;
    status: Enums<"question_status">;
    created_at: string;
    last_message_at: string;
    last_message_by: string | null;
    updated_at: string;
  }>;

  if (rows.length === 0) {
    return [];
  }

  const questionIds = rows.map((row) => row.id);
  const authorsById = userIsAdmin
    ? await loadAuthors([...new Set(rows.map((row) => row.user_id))])
    : new Map<string, QuestionAuthor>();

  const [{ data: lastMessages }, { data: readRows }, { data: messageRows }] = await Promise.all([
    supabase
      .from("question_messages")
      .select("question_id, message, created_at")
      .in("question_id", questionIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("question_chat_reads")
      .select("question_id, last_read_at")
      .eq("user_id", user.id)
      .in("question_id", questionIds),
    supabase
      .from("question_messages")
      .select("id, question_id, sender_id, created_at")
      .in("question_id", questionIds),
  ]);

  const previewByQuestion = new Map<string, string>();

  for (const message of (lastMessages ?? []) as Array<{
    question_id: string;
    message: string;
  }>) {
    if (!previewByQuestion.has(message.question_id)) {
      previewByQuestion.set(message.question_id, message.message);
    }
  }

  const lastReadByQuestion = new Map<string, string>();

  for (const read of (readRows ?? []) as Array<{ question_id: string; last_read_at: string }>) {
    lastReadByQuestion.set(read.question_id, read.last_read_at);
  }

  const unreadByQuestion = new Map<string, number>();

  for (const message of (messageRows ?? []) as Array<{
    question_id: string;
    sender_id: string;
    created_at: string;
  }>) {
    if (message.sender_id === user.id) {
      continue;
    }

    const conversation = rows.find((row) => row.id === message.question_id);

    if (!conversation) {
      continue;
    }

    if (userIsAdmin && message.sender_id !== conversation.user_id) {
      continue;
    }

    const lastReadAt = lastReadByQuestion.get(message.question_id);
    const isUnread =
      !lastReadAt || new Date(message.created_at).getTime() > new Date(lastReadAt).getTime();

    if (!isUnread) {
      continue;
    }

    unreadByQuestion.set(
      message.question_id,
      (unreadByQuestion.get(message.question_id) ?? 0) + 1,
    );
  }

  let summaries: ConversationSummary[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    subject: row.subject,
    status: row.status,
    created_at: row.created_at,
    last_message_at: row.last_message_at,
    last_message_by: row.last_message_by,
    updated_at: row.updated_at,
    last_message_preview: previewByQuestion.get(row.id) ?? row.subject,
    unread_count: unreadByQuestion.get(row.id) ?? 0,
    author: authorsById.get(row.user_id) ?? null,
  }));

  if (userIsAdmin && filter === "unread") {
    summaries = summaries.filter((item) => item.unread_count > 0);
  }

  summaries.sort((left, right) => {
    if (left.unread_count > 0 && right.unread_count === 0) {
      return -1;
    }

    if (left.unread_count === 0 && right.unread_count > 0) {
      return 1;
    }

    return (
      new Date(right.last_message_at).getTime() - new Date(left.last_message_at).getTime()
    );
  });

  return summaries;
}

export async function getConversationMessages(
  questionId: string,
  options?: { before?: string; limit?: number },
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const user = await getAuthenticatedUser();

  if (!user || !questionId) {
    return { messages: [], hasMore: false };
  }

  const supabase = await createClient();
  const userIsAdmin = await isAdmin(user.id);
  const limit = Math.min(Math.max(options?.limit ?? CHAT_MESSAGES_PAGE_SIZE, 1), 100);

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, user_id")
    .eq("id", questionId)
    .maybeSingle();

  if (questionError || !question) {
    return { messages: [], hasMore: false };
  }

  const questionRow = question as { id: string; user_id: string };

  if (!userIsAdmin && questionRow.user_id !== user.id) {
    return { messages: [], hasMore: false };
  }

  let query = supabase
    .from("question_messages")
    .select("id, question_id, sender_id, message, created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load chat messages:", error.message);
    return { messages: [], hasMore: false };
  }

  const rows = (data ?? []) as QuestionMessage[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const chronological = [...page].reverse();
  const adminSenderIds = await loadAdminSenderIds([
    ...new Set(chronological.map((row) => row.sender_id)),
  ]);

  return {
    messages: chronological.map((row) => ({
      ...row,
      is_own: row.sender_id === user.id,
      is_admin_sender: adminSenderIds.has(row.sender_id),
    })),
    hasMore,
  };
}

export async function getUnreadQuestionMessagesCount(): Promise<number> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return 0;
  }

  const supabase = await createClient();
  const userIsAdmin = await isAdmin(user.id);

  if (userIsAdmin) {
    const { data, error } = await supabase.rpc("count_unread_question_messages_for_admin");

    if (error) {
      console.error("Failed to count admin unread question messages:", error.message);
      return 0;
    }

    return typeof data === "number" ? data : 0;
  }

  const { data, error } = await supabase.rpc("count_unread_question_answers");

  if (error) {
    console.error("Failed to count employee unread question messages:", error.message);
    return 0;
  }

  return typeof data === "number" ? data : 0;
}

/** @deprecated Prefer getUnreadQuestionMessagesCount */
export async function getNewQuestionsCount(): Promise<number> {
  return getUnreadQuestionMessagesCount();
}

export async function createQuestion(formData: FormData): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему, щоб написати повідомлення." };
  }

  if (await isAdmin(user.id)) {
    return { success: false, error: "Адміністратор не може створювати звернення співробітника." };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!subject) {
    return { success: false, error: "Вкажіть тему звернення." };
  }

  if (subject.length > QUESTION_SUBJECT_MAX_LENGTH) {
    return {
      success: false,
      error: `Тема не може перевищувати ${QUESTION_SUBJECT_MAX_LENGTH} символів.`,
    };
  }

  const messageError = validateMessageText(message);

  if (messageError) {
    return { success: false, error: messageError };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const questionPayload: TablesInsert<"questions"> = {
    user_id: user.id,
    subject,
    message,
    status: "new",
    last_message_at: now,
    last_message_by: user.id,
    updated_at: now,
  };

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .insert(questionPayload as never)
    .select("id, subject")
    .single();

  if (questionError || !question) {
    console.error("Failed to create conversation:", questionError?.message);
    return { success: false, error: "Не вдалося створити звернення. Спробуйте ще раз." };
  }

  const questionId = (question as { id: string; subject: string }).id;

  const messagePayload: TablesInsert<"question_messages"> = {
    question_id: questionId,
    sender_id: user.id,
    message,
    created_at: now,
  };

  const { data: savedMessage, error: messageInsertError } = await supabase
    .from("question_messages")
    .insert(messagePayload as never)
    .select("id, question_id, sender_id, message, created_at")
    .single();

  if (messageInsertError || !savedMessage) {
    console.error("Failed to save first chat message:", messageInsertError?.message);
    await supabase.from("questions").delete().eq("id", questionId);
    return { success: false, error: "Не вдалося надіслати повідомлення." };
  }

  await supabase.from("question_chat_reads").upsert(
    {
      question_id: questionId,
      user_id: user.id,
      last_read_at: now,
    } as never,
    { onConflict: "question_id,user_id" },
  );

  revalidateQuestionPaths();

  let pushWarning: string | undefined;

  try {
    const authorProfiles = await loadAuthors([user.id]);
    const author = authorProfiles.get(user.id);
    const authorLabel = author?.full_name?.trim() || author?.email?.trim() || "менеджер";

    pushWarning = await notifyAdminsQuestionMessage(
      (savedMessage as QuestionMessage).id,
      questionId,
      subject,
      authorLabel,
    );
  } catch (error) {
    console.error("Employee chat message notification failed:", error);
  }

  return {
    success: true,
    pushWarning,
    questionId,
    message: {
      ...(savedMessage as QuestionMessage),
      is_own: true,
      is_admin_sender: false,
    },
  };
}

export async function sendQuestionMessage(
  questionId: string,
  messageText: string,
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!questionId) {
    return { success: false, error: "Чат не знайдено." };
  }

  const trimmed = messageText.trim();
  const validationError = validateMessageText(trimmed);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();
  const userIsAdmin = await isAdmin(user.id);

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, user_id, subject, status")
    .eq("id", questionId)
    .maybeSingle();

  if (questionError || !question) {
    return { success: false, error: "Чат не знайдено." };
  }

  const conversation = question as {
    id: string;
    user_id: string;
    subject: string;
    status: Enums<"question_status">;
  };

  if (!userIsAdmin && conversation.user_id !== user.id) {
    return { success: false, error: "Немає доступу до цього чату." };
  }

  const messagePayload: TablesInsert<"question_messages"> = {
    question_id: questionId,
    sender_id: user.id,
    message: trimmed,
  };

  const { data: savedMessage, error: insertError } = await supabase
    .from("question_messages")
    .insert(messagePayload as never)
    .select("id, question_id, sender_id, message, created_at")
    .single();

  if (insertError || !savedMessage) {
    console.error("Failed to send chat message:", insertError?.message);
    return { success: false, error: "Не вдалося надіслати повідомлення." };
  }

  const now = (savedMessage as QuestionMessage).created_at;

  await supabase.from("question_chat_reads").upsert(
    {
      question_id: questionId,
      user_id: user.id,
      last_read_at: now,
    } as never,
    { onConflict: "question_id,user_id" },
  );

  if (userIsAdmin && conversation.status === "new") {
    await supabase
      .from("questions")
      .update({ status: "progress" satisfies Enums<"question_status"> } as never)
      .eq("id", questionId)
      .eq("status", "new");
  }

  revalidateQuestionPaths();

  let pushWarning: string | undefined;

  try {
    if (userIsAdmin) {
      pushWarning = await notifyEmployeeQuestionMessage(
        (savedMessage as QuestionMessage).id,
        questionId,
        conversation.user_id,
        conversation.subject,
      );
    } else {
      const authorProfiles = await loadAuthors([user.id]);
      const author = authorProfiles.get(user.id);
      const authorLabel = author?.full_name?.trim() || author?.email?.trim() || "менеджер";

      pushWarning = await notifyAdminsQuestionMessage(
        (savedMessage as QuestionMessage).id,
        questionId,
        conversation.subject,
        authorLabel,
      );
    }
  } catch (error) {
    console.error("Chat message notification failed:", error);
  }

  return {
    success: true,
    pushWarning,
    questionId,
    message: {
      ...(savedMessage as QuestionMessage),
      is_own: true,
      is_admin_sender: userIsAdmin,
    },
  };
}

export async function updateQuestionStatus(
  questionId: string,
  status: Enums<"question_status">,
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може змінювати статус." };
  }

  if (!questionId) {
    return { success: false, error: "Чат не знайдено." };
  }

  if (status !== "new" && status !== "progress" && status !== "answered") {
    return { success: false, error: "Невірний статус." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("questions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", questionId);

  if (error) {
    console.error("Failed to update conversation status:", error.message);
    return { success: false, error: "Не вдалося оновити статус." };
  }

  revalidateQuestionPaths();

  return { success: true };
}

export async function takeQuestionInProgress(questionId: string): Promise<ActionResult> {
  return updateQuestionStatus(questionId, "progress");
}

export async function closeQuestion(questionId: string): Promise<ActionResult> {
  return updateQuestionStatus(questionId, "answered");
}

export async function reopenQuestion(questionId: string): Promise<ActionResult> {
  return updateQuestionStatus(questionId, "progress");
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може видаляти чат." };
  }

  if (!questionId) {
    return { success: false, error: "Чат не знайдено." };
  }

  const admin = createAdminClient();

  const { error: questionError } = await admin.from("questions").delete().eq("id", questionId);

  if (questionError) {
    console.error("Failed to delete conversation:", questionError.message);
    return { success: false, error: "Не вдалося видалити чат." };
  }

  revalidateQuestionPaths();

  return { success: true };
}
