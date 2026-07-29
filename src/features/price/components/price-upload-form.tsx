"use client";

import { FormEvent, useRef, useState } from "react";

import { uploadPriceFile } from "@/features/price/actions";
import { PRICE_ALLOWED_EXTENSIONS } from "@/features/price/constants";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function PriceUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsUploading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await uploadPriceFile(formData);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessMessage("Прайс завантажено.");

      if (result.pushWarning) {
        setSuccessMessage((current) => `${current} ${result.pushWarning}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час завантаження.";

      setErrorMessage(message);
      console.error("Price upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }

  const acceptValue = PRICE_ALLOWED_EXTENSIONS.join(",");

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="price-file">Новий прайс (Excel або PDF)</Label>
        <Input
          ref={fileInputRef}
          id="price-file"
          name="file"
          type="file"
          accept={acceptValue}
          required
          disabled={isUploading}
        />
        <p className="text-sm text-muted-foreground">
          Дозволені формати: .xlsx, .pdf. Максимальний розмір: 25 МБ.
        </p>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}

      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Завантаження…" : "Завантажити прайс"}
      </Button>
    </form>
  );
}
