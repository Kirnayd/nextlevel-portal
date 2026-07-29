"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { EmployeeUnreadCounts } from "@/features/unread/actions";
import { getEmployeeUnreadCounts } from "@/features/unread/actions";
import { NavCountBadge } from "@/shared/components/nav-count-badge";

type EmployeeDashboardNavProps = {
  initialCounts: EmployeeUnreadCounts;
};

const navLinkClassName =
  "relative inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90";

export function EmployeeDashboardNav({ initialCounts }: EmployeeDashboardNavProps) {
  const [counts, setCounts] = useState(initialCounts);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void getEmployeeUnreadCounts().then(setCounts);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <Link href="/announcements" prefetch className={navLinkClassName}>
        Оголошення
        <NavCountBadge
          count={counts.announcements}
          ariaLabel={`Непрочитаних оголошень: ${counts.announcements}`}
        />
      </Link>

      <Link href="/price" prefetch className={navLinkClassName}>
        Прайс
        <NavCountBadge count={counts.price} ariaLabel={`Новий прайс: ${counts.price}`} />
      </Link>

      <Link href="/documents" prefetch className={navLinkClassName}>
        Документи
      </Link>

      <Link href="/questions" prefetch className={navLinkClassName}>
        Запитання
        <NavCountBadge
          count={counts.questions}
          ariaLabel={`Непрочитаних відповідей: ${counts.questions}`}
        />
      </Link>
    </>
  );
}
