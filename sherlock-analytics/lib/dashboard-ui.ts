import { cn } from "@/lib/utils"

/** Tab bar container — teal border, muted inactive labels */
export const dashboardTabListClass =
  "grid h-auto w-full grid-cols-3 gap-1 rounded-lg border border-primary/40 bg-muted/25 p-1 text-muted-foreground lg:grid-cols-7 lg:w-fit"

/**
 * Tab triggers: inactive muted; active = teal border + ring (matches card chrome).
 */
export const dashboardTabTriggerClass = cn(
  "gap-2 rounded-md px-3 py-2.5 font-medium transition-colors sm:px-4 sm:py-3",
  "border border-transparent text-muted-foreground hover:text-foreground",
  "data-[state=active]:bg-background data-[state=active]:text-foreground",
  "data-[state=active]:border-primary data-[state=active]:border",
  "data-[state=active]:ring-2 data-[state=active]:ring-primary/25",
  "data-[state=active]:shadow-none",
)
