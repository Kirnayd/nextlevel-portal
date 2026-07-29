"use client";

import { FormEvent, useState } from "react";

import {
  blockUser,
  deleteUser,
  setUserPassword,
  unblockUser,
  updateUser,
  type ManagedUser,
} from "@/features/users/actions";
import { USER_ROLE_LABELS } from "@/features/users/constants";
import { formatUserDateTime } from "@/features/users/lib/format";
import { UserRoleBadge, UserStatusBadge } from "@/features/users/components/user-badges";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type UserRowProps = {
  user: ManagedUser;
  currentUserId: string;
};

export function UserRow({ user, currentUserId }: UserRowProps) {
  const isCurrentUser = user.id === currentUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await updateUser(user.id, new FormData(event.currentTarget));

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Дані користувача оновлено.");
      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час оновлення користувача.";

      setErrorMessage(message);
      console.error("Update user error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await setUserPassword(user.id, new FormData(form));

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      form.reset();
      setSuccessMessage("Пароль успішно змінено.");
      setIsSettingPassword(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час зміни пароля.";

      setErrorMessage(message);
      console.error("Set user password error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBlockToggle() {
    const isBlocking = !user.is_blocked;

    if (isBlocking) {
      const confirmed = window.confirm(
        `Заблокувати користувача ${user.full_name ?? user.email ?? user.id}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = isBlocking ? await blockUser(user.id) : await unblockUser(user.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage(isBlocking ? "Користувача заблоковано." : "Користувача розблоковано.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час зміни статусу.";

      setErrorMessage(message);
      console.error("Block/unblock user error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Видалити користувача ${user.full_name ?? user.email ?? user.id}? Цю дію не можна скасувати.`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await deleteUser(user.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Користувача видалено.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення користувача.";

      setErrorMessage(message);
      console.error("Delete user error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto_auto_auto_auto] md:items-center">
        <div>
          <p className="font-medium">{user.full_name ?? "—"}</p>
          {isCurrentUser ? (
            <p className="text-xs text-muted-foreground">Це ваш обліковий запис</p>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground break-all">{user.email ?? "—"}</p>

        <UserRoleBadge role={user.role} />
        <UserStatusBadge isBlocked={user.is_blocked} />

        <div className="text-sm text-muted-foreground">
          <p>Створено: {formatUserDateTime(user.created_at)}</p>
          <p>Останній вхід: {formatUserDateTime(user.last_sign_in_at)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => {
            setIsEditing((value) => !value);
            setIsSettingPassword(false);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          {isEditing ? "Закрити редагування" : "Редагувати"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => {
            setIsSettingPassword((value) => !value);
            setIsEditing(false);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          {isSettingPassword ? "Скасувати пароль" : "Встановити новий пароль"}
        </Button>

        {!isCurrentUser ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={handleBlockToggle}
          >
            {user.is_blocked ? "Розблокувати" : "Заблокувати"}
          </Button>
        ) : null}

        {!isCurrentUser ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isSubmitting}
            onClick={handleDelete}
          >
            Видалити користувача
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <form className="mt-4 space-y-4 border-t pt-4" onSubmit={handleUpdateUser}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-full-name-${user.id}`}>ПІБ</Label>
              <Input
                id={`edit-full-name-${user.id}`}
                name="full_name"
                required
                disabled={isSubmitting}
                defaultValue={user.full_name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-email-${user.id}`}>Email</Label>
              <Input
                id={`edit-email-${user.id}`}
                name="email"
                type="email"
                required
                disabled={isSubmitting}
                defaultValue={user.email ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-role-${user.id}`}>Роль</Label>
            <select
              id={`edit-role-${user.id}`}
              name="role"
              required
              disabled={isSubmitting || isCurrentUser}
              defaultValue={user.role}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="employee">{USER_ROLE_LABELS.employee}</option>
              <option value="admin">{USER_ROLE_LABELS.admin}</option>
            </select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Збереження…" : "Зберегти зміни"}
          </Button>
        </form>
      ) : null}

      {isSettingPassword ? (
        <form className="mt-4 space-y-4 border-t pt-4" onSubmit={handleSetPassword}>
          <div className="space-y-2">
            <Label htmlFor={`password-${user.id}`}>Новий тимчасовий пароль</Label>
            <Input
              id={`password-${user.id}`}
              name="password"
              type="password"
              required
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Збереження…" : "Зберегти пароль"}
          </Button>
        </form>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      ) : null}
    </article>
  );
}
