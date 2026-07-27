import type { User } from "@supabase/supabase-js";

import { createClient } from "@/infrastructure/supabase/server";
import type { Enums } from "@/shared/types/database.types";

export type UserRole = Enums<"user_role">;

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const profile = data as { role: UserRole } | null;

  return profile?.role ?? "employee";
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin";
}
