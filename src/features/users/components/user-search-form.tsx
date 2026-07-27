type UserSearchFormProps = {
  defaultQuery?: string;
};

export function UserSearchForm({ defaultQuery = "" }: UserSearchFormProps) {
  return (
    <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <label htmlFor="users-search" className="text-sm font-medium">
          Пошук
        </label>
        <input
          id="users-search"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="ПІБ або email"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Знайти
      </button>
    </form>
  );
}
