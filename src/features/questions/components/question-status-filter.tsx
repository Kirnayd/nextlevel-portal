import Link from "next/link";

import {
  QUESTION_FILTER_OPTIONS,
  type QuestionFilter,
} from "@/features/questions/constants";
import { cn } from "@/shared/lib/utils";

type QuestionStatusFilterProps = {
  activeFilter: QuestionFilter;
};

export function QuestionStatusFilter({ activeFilter }: QuestionStatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUESTION_FILTER_OPTIONS.map((option) => {
        const isActive = activeFilter === option.value;
        const href =
          option.value === "all" ? "/questions" : `/questions?status=${option.value}`;

        return (
          <Link
            key={option.value}
            href={href}
            className={cn(
              "inline-flex rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
