type PageLoadingSkeletonProps = {
  maxWidthClassName?: string;
};

export function PageLoadingSkeleton({
  maxWidthClassName = "max-w-3xl",
}: PageLoadingSkeletonProps) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className={`mx-auto w-full ${maxWidthClassName} animate-pulse space-y-6`}>
        <div className="space-y-2">
          <div className="h-9 w-48 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
