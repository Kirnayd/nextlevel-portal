import type { Enums } from "@/shared/types/database.types";

export type QuestionStatus = Enums<"question_status">;

export type QuestionFilter = "all" | QuestionStatus | "unread";

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  new: "Нове",
  progress: "В роботі",
  answered: "Закрите",
};

export const QUESTION_FILTER_OPTIONS: { value: QuestionFilter; label: string }[] = [
  { value: "all", label: "Усі" },
  { value: "new", label: "Нові" },
  { value: "progress", label: "У роботі" },
  { value: "answered", label: "Закриті" },
  { value: "unread", label: "Непрочитані" },
];

export const QUESTION_SUBJECT_MAX_LENGTH = 200;
export const QUESTION_MESSAGE_MAX_LENGTH = 10000;
export const CHAT_MESSAGES_PAGE_SIZE = 50;
