import { Pin } from "lucide-react";

export function PinnedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
      <Pin className="size-3" />
      Закріплено
    </span>
  );
}
