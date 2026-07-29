import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/infrastructure/supabase/server";
import type { Enums } from "@/shared/types/database.types";

export type UserRole = Enums<"user_role">;

export type SessionContext = {
  user: User;
  role: UserRole;
  isAdmin: boolean;
};

export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getUserRole = cache(async (userId: string): Promise<UserRole> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const profile = data as { role: UserRole } | null;

  return profile?.role ?? "employee";
});

export const isAdmin = cache(async (userId: string): Promise<boolean> => {
  const role = await getUserRole(userId);
  return role === "admin";
});

export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const role = await getUserRole(user.id);

  return {
    user,
    role,
    isAdmin: role === "admin",
  };
});
