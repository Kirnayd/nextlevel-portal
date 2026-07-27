import { USER_ROLE_LABELS } from "@/features/users/constants";

type UserStatusBadgeProps = {
  isBlocked: boolean;
};

export function UserStatusBadge({ isBlocked }: UserStatusBadgeProps) {
  if (isBlocked) {
    return (
      <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
        Заблоковано
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
      Активний
    </span>
  );
}

type UserRoleBadgeProps = {
  role: keyof typeof USER_ROLE_LABELS;
};

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
      {USER_ROLE_LABELS[role]}
    </span>
  );
}
