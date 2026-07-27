import type { Enums } from "@/shared/types/database.types";

export type QuestionStatus = Enums<"question_status">;

export type QuestionFilter = "all" | QuestionStatus;

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  new: "Нове",
  progress: "В роботі",
  answered: "Відповіли",
};

export const QUESTION_FILTER_OPTIONS: { value: QuestionFilter; label: string }[] = [
  { value: "all", label: "Усі" },
  { value: "new", label: "Нові" },
  { value: "progress", label: "В роботі" },
  { value: "answered", label: "Відповіли" },
];

export const QUESTION_SUBJECT_MAX_LENGTH = 200;
export const QUESTION_MESSAGE_MAX_LENGTH = 5000;
export const ANSWER_MESSAGE_MAX_LENGTH = 5000;
