"use client";

import { clearAppBadge } from "@/features/app-badge/app-badge";

type LogoutButtonProps = {
  className?: string;
  children: React.ReactNode;
};

export function LogoutButton({ className, children }: LogoutButtonProps) {
  return (
    <form
      action="/api/logout"
      method="post"
      className={className}
      onSubmit={() => {
        void clearAppBadge();
      }}
    >
      <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">
        {children}
      </button>
    </form>
  );
}
