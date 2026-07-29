"use client";

import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type DocumentsControlsProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  hideEmpty: boolean;
  onHideEmptyChange: (value: boolean) => void;
  preferencesReady: boolean;
};

export function DocumentsControls({
  searchQuery,
  onSearchQueryChange,
  hideEmpty,
  onHideEmptyChange,
  preferencesReady,
}: DocumentsControlsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full space-y-2 sm:max-w-md">
        <Label htmlFor="documents-search">Пошук</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="documents-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="За назвою, файлу, категорією або підкатегорією…"
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border border-input accent-primary"
          checked={hideEmpty}
          disabled={!preferencesReady}
          onChange={(event) => onHideEmptyChange(event.target.checked)}
        />
        <span>Приховати порожні категорії</span>
      </label>
    </div>
  );
}
