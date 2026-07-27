import type { Enums } from "@/shared/types/database.types";

export type UserRole = Enums<"user_role">;

export const USER_PASSWORD_MIN_LENGTH = 6;
export const USER_BAN_DURATION = "876000h";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  employee: "Менеджер",
  admin: "Адміністратор",
};
