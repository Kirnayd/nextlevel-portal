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

export const getUserRole = cache(async (userId: string): Promise<UserRole | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] Failed to load profile role:", {
      userId,
      message: error.message,
    });
    return null;
  }

  const profile = data as { role: UserRole } | null;

  if (!profile?.role) {
    console.error("[auth] Profile role missing:", { userId });
    return null;
  }

  if (profile.role !== "admin" && profile.role !== "employee") {
    console.error("[auth] Unexpected profile role:", {
      userId,
      role: profile.role,
    });
    return null;
  }

  return profile.role;
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

  if (!role) {
    return null;
  }

  return {
    user,
    role,
    isAdmin: role === "admin",
  };
});
