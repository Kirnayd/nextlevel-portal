"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import {
  USER_BAN_DURATION,
  USER_PASSWORD_MIN_LENGTH,
  type UserRole,
} from "@/features/users/constants";
import { formatSupabaseError, logSupabaseError } from "@/features/users/lib/errors";
import { createAdminClient } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/shared/lib/auth";
import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";

export type Profile = Tables<"profiles">;

export type ManagedUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  is_blocked: boolean;
};

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>> } | ActionResult
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Увійдіть у систему." };
  }

  if (!(await isAdmin(user.id))) {
    return { success: false, error: "Лише адміністратор може виконати цю дію." };
  }

  return { user };
}

function isAuthUserBlocked(authUser: User): boolean {
  if (!authUser.banned_until) {
    return false;
  }

  return new Date(authUser.banned_until).getTime() > Date.now();
}

async function loadAuthUsersById(): Promise<Map<string, User>> {
  const adminClient = createAdminClient();
  const authUsersById = new Map<string, User>();
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      logSupabaseError("Failed to list auth users", error);
      throw new Error(formatSupabaseError(error));
    }

    for (const authUser of data.users) {
      authUsersById.set(authUser.id, authUser);
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return authUsersById;
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesSearch(user: ManagedUser, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalizeSearchQuery(query);
  const fullName = (user.full_name ?? "").toLowerCase();
  const email = (user.email ?? "").toLowerCase();

  return fullName.includes(normalizedQuery) || email.includes(normalizedQuery);
}

function parseRoleFromForm(formData: FormData): UserRole | null {
  const role = String(formData.get("role") ?? "");

  if (role === "admin" || role === "employee") {
    return role;
  }

  return null;
}

function validatePassword(password: string): string | null {
  if (!password) {
    return "Вкажіть тимчасовий пароль.";
  }

  if (password.length < USER_PASSWORD_MIN_LENGTH) {
    return `Пароль має містити щонайменше ${USER_PASSWORD_MIN_LENGTH} символів.`;
  }

  return null;
}

function validateUserFields(
  fullName: string,
  email: string,
  role: UserRole | null,
): string | null {
  if (!fullName.trim()) {
    return "Вкажіть ПІБ користувача.";
  }

  if (!email.trim()) {
    return "Вкажіть email користувача.";
  }

  if (!role) {
    return "Оберіть роль користувача.";
  }

  return null;
}

export async function getUsers(searchQuery = ""): Promise<ManagedUser[]> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return [];
  }

  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) {
    logSupabaseError("Failed to load profiles", profilesError);
    return [];
  }

  const authUsersById = await loadAuthUsersById();

  const users = ((profiles ?? []) as Profile[]).map((profile) => {
    const authUser = authUsersById.get(profile.id);

    return {
      id: profile.id,
      email: profile.email ?? authUser?.email ?? null,
      full_name: profile.full_name ?? authUser?.user_metadata?.full_name ?? null,
      role: profile.role,
      created_at: profile.created_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      is_blocked: authUser ? isAuthUserBlocked(authUser) : false,
    } satisfies ManagedUser;
  });

  return users.filter((user) => matchesSearch(user, searchQuery));
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const fullName = String(formData.get("full_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = parseRoleFromForm(formData);

  const validationError = validateUserFields(fullName, email, role);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    return { success: false, error: passwordError };
  }

  const adminClient = createAdminClient();

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
    },
  });

  if (authError) {
    logSupabaseError("Failed to create auth user", authError);
    return { success: false, error: formatSupabaseError(authError) };
  }

  if (!authData.user) {
    return { success: false, error: "Auth-користувача не створено." };
  }

  const profilePayload: TablesInsert<"profiles"> = {
    id: authData.user.id,
    email: email.trim(),
    full_name: fullName.trim(),
    role: role!,
  };

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(profilePayload as never, { onConflict: "id" });

  if (profileError) {
    logSupabaseError("Failed to create profile after auth user creation", profileError);

    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(authData.user.id);

    if (rollbackError) {
      logSupabaseError("Failed to rollback auth user after profile error", rollbackError);
      return {
        success: false,
        error: `${formatSupabaseError(profileError)} | Rollback failed: ${formatSupabaseError(rollbackError)}`,
      };
    }

    return { success: false, error: formatSupabaseError(profileError) };
  }

  revalidatePath("/users");

  return { success: true };
}

export async function updateUser(userId: string, formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const { user: currentUser } = adminResult;

  if (!userId) {
    return { success: false, error: "Користувача не знайдено." };
  }

  const fullName = String(formData.get("full_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const role = parseRoleFromForm(formData);

  const validationError = validateUserFields(fullName, email, role);

  if (validationError) {
    return { success: false, error: validationError };
  }

  if (userId === currentUser.id && role !== "admin") {
    return { success: false, error: "Ви не можете зняти з себе роль адміністратора." };
  }

  const adminClient = createAdminClient();

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email: email.trim(),
    user_metadata: {
      full_name: fullName.trim(),
    },
  });

  if (authError) {
    logSupabaseError("Failed to update auth user", authError);
    return { success: false, error: formatSupabaseError(authError) };
  }

  const profilePayload: TablesUpdate<"profiles"> = {
    email: email.trim(),
    full_name: fullName.trim(),
    role: role!,
  };

  const { error: profileError } = await adminClient
    .from("profiles")
    .update(profilePayload as never)
    .eq("id", userId);

  if (profileError) {
    logSupabaseError("Failed to update profile", profileError);
    return { success: false, error: formatSupabaseError(profileError) };
  }

  revalidatePath("/users");

  return { success: true };
}

export async function setUserPassword(userId: string, formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!userId) {
    return { success: false, error: "Користувача не знайдено." };
  }

  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);

  if (passwordError) {
    return { success: false, error: passwordError };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    logSupabaseError("Failed to set user password", error);
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidatePath("/users");

  return { success: true };
}

export async function blockUser(userId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const { user: currentUser } = adminResult;

  if (!userId) {
    return { success: false, error: "Користувача не знайдено." };
  }

  if (userId === currentUser.id) {
    return { success: false, error: "Ви не можете заблокувати власний обліковий запис." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: USER_BAN_DURATION,
  });

  if (error) {
    logSupabaseError("Failed to block user", error);
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidatePath("/users");

  return { success: true };
}

export async function unblockUser(userId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  if (!userId) {
    return { success: false, error: "Користувача не знайдено." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (error) {
    logSupabaseError("Failed to unblock user", error);
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidatePath("/users");

  return { success: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();

  if ("success" in adminResult) {
    return adminResult;
  }

  const { user: currentUser } = adminResult;

  if (!userId) {
    return { success: false, error: "Користувача не знайдено." };
  }

  if (userId === currentUser.id) {
    return { success: false, error: "Ви не можете видалити власний обліковий запис." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    logSupabaseError("Failed to delete auth user", error);
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidatePath("/users");

  return { success: true };
}
