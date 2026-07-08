import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="rounded-xl border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 animate-fade-in', className)}>
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
