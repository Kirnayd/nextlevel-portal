import { NavCountBadge } from "@/shared/components/nav-count-badge";

type NewQuestionsBadgeProps = {
  count: number;
};

export function NewQuestionsBadge({ count }: NewQuestionsBadgeProps) {
  return (
    <NavCountBadge count={count} ariaLabel={`Непрочитаних повідомлень: ${count}`} />
  );
}
