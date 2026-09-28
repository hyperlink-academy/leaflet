import { MenuSmall } from "components/Icons/MenuSmall";

export function DashboardEmptyState(props: { children: React.ReactNode }) {
  return (
    <div className="grow flex flex-col items-center justify-center gap-3">
      <div className="opaque-container rounded-lg! w-full max-w-md px-4 pt-5 pb-3 flex flex-col items-center gap-2 text-center">
        {props.children}
        <hr className="w-full mt-2" />
        <p className="text-sm text-tertiary text-center">
          Use{" "}
          <span className="sm:hidden inline-flex items-center align-middle mb-0.5 border border-border rounded-md">
            <MenuSmall className="scale-80" />
          </span>
          <span className="hidden sm:inline"> the sidebar</span> to navigate the
          dashboard
        </p>
      </div>
    </div>
  );
}
