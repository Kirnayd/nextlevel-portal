import { ImageIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

type AnnouncementImagePlaceholderProps = {
  className?: string;
};

export function AnnouncementImagePlaceholder({ className }: AnnouncementImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <ImageIcon className="size-8 opacity-60" />
        <span className="text-xs">Немає зображень</span>
      </div>
    </div>
  );
}
