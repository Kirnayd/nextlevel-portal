type SupabaseErrorLike = {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

export function formatSupabaseError(error: SupabaseErrorLike): string {
  const parts = [error.message];

  if (error.details) {
    parts.push(`Details: ${error.details}`);
  }

  if (error.hint) {
    parts.push(`Hint: ${error.hint}`);
  }

  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }

  return parts.join(" | ");
}

export function logSupabaseError(context: string, error: SupabaseErrorLike): void {
  const formatted = formatSupabaseError(error);
  console.error(`${context}: ${formatted}`, error);
}
