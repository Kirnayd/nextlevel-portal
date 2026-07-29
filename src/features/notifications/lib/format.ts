import type { UserNotificationType } from "@/infrastructure/notifications/create-user-notifications";

export function getNotificationIcon(type: UserNotificationType): string {
  switch (type) {
    case "announcement":
      return "📢";
    case "price":
      return "💰";
    case "document":
      return "📄";
    case "question_answer":
      return "💬";
    default:
      return "🔔";
  }
}

export function formatNotificationDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getUnreadBadgeLabel(count: number): string {
  if (count > 99) {
    return "99+";
  }

  return String(count);
}
