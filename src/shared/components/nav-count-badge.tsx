type NavCountBadgeProps = {
  count: number;
  ariaLabel: string;
};

function getBadgeLabel(count: number): string {
  if (count > 99) {
    return "99+";
  }

  return String(count);
}

export function NavCountBadge({ count, ariaLabel }: NavCountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={ariaLabel}
      className="pointer-events-none absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white"
    >
      {getBadgeLabel(count)}
    </span>
  );
}
