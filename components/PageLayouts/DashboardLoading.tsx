import { LoadingTiny } from "components/Icons/LoadingTiny";

// Fallback for the dashboard segments' loading.tsx. Each of those boundaries
// sits inside the layout that renders the shell, so only the content column
// swaps to this — the sidebar and page title stay mounted. `grow` because the
// slot is a flex row child (DashboardShell) on some pages and a flex column
// child (DashboardPageLayout, ProfileLayout) on others.
export function DashboardLoading() {
  return (
    <div className="w-full grow flex items-center justify-center py-8 text-tertiary">
      <LoadingTiny className="animate-spin" />
    </div>
  );
}

// Full-viewport variant for the Suspense boundaries wrapping the identity
// route groups' request-coupled layouts, where no shell exists yet to slot
// into.
export function FullPageLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center text-tertiary">
      <LoadingTiny className="animate-spin" />
    </div>
  );
}
