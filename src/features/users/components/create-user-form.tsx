"use client";

import { FormEvent, useRef, useState } from "react";

import { createUser } from "@/features/users/actions";
import { USER_ROLE_LABELS } from "@/features/users/constants";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type CreateUserFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CreateUserForm({ onSuccess, onCancel }: CreateUserFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = formRef.current ?? event.currentTarget;
    const payload = new FormData(form);

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await createUser(payload);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      form.reset();
      setSuccessMessage("Користувача створено.");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час створення користувача.";

      setErrorMessage(message);
      console.error("Create user error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="create-user-full-name">ПІБ</Label>
        <Input
          id="create-user-full-name"
          name="full_name"
          required
          disabled={isSubmitting}
          placeholder="Повне ім'я"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-user-email">Email</Label>
        <Input
          id="create-user-email"
          name="email"
          type="email"
          required
          disabled={isSubmitting}
          placeholder="email@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-user-password">Тимчасовий пароль</Label>
        <Input
          id="create-user-password"
          name="password"
          type="password"
          required
          disabled={isSubmitting}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-user-role">Роль</Label>
        <select
          id="create-user-role"
          name="role"
          required
          disabled={isSubmitting}
          defaultValue="employee"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="employee">{USER_ROLE_LABELS.employee}</option>
          <option value="admin">{USER_ROLE_LABELS.admin}</option>
        </select>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Створення…" : "Створити"}
        </Button>

        {onCancel ? (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Скасувати
          </Button>
        ) : null}
      </div>
    </form>
  );
}
