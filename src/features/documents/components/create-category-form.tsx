"use client";

import { FormEvent, useState } from "react";

import { createCategory } from "@/features/documents/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type CreateCategoryFormProps = {
  onSuccess?: () => void;
};

export function CreateCategoryForm({ onSuccess }: CreateCategoryFormProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      const result = await createCategory(formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      form.reset();
      setSuccessMessage("Категорію створено.");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час створення категорії.";

      setErrorMessage(message);
      console.error("Create category error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="category-name">Назва категорії</Label>
        <Input
          id="category-name"
          name="name"
          required
          disabled={isSubmitting}
          placeholder="Наприклад, Договори"
        />
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Створення…" : "Створити категорію"}
      </Button>
    </form>
  );
}
