import type { QuestionStatus } from "@/features/questions/constants";
import { QUESTION_STATUS_LABELS } from "@/features/questions/constants";
import { cn } from "@/shared/lib/utils";

const STATUS_STYLES: Record<QuestionStatus, string> = {
  new: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  progress: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  answered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

type QuestionStatusBadgeProps = {
  status: QuestionStatus;
  className?: string;
};

export function QuestionStatusBadge({ status, className }: QuestionStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {QUESTION_STATUS_LABELS[status]}
    </span>
  );
}
