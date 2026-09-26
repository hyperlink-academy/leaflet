import { MenuSmall } from "components/Icons/MenuSmall";

export function DashboardEmptyState(props: {
  title: string;
  description: React.ReactNode;
  cta?: React.ReactNode;
  illustration?: React.ReactNode;
}) {
  return (
    <div className="grow flex flex-col items-center justify-center gap-3 py-8">
      <div className="opaque-container rounded-lg! w-full max-w-md px-4 pt-5 pb-6 flex flex-col items-center gap-2 text-center">
        {props.illustration}
        <h3 className="text-primary">{props.title}</h3>
        <div className="text-secondary flex flex-col gap-2">
          {props.description}
        </div>
        {props.cta && (
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {props.cta}
          </div>
        )}
      </div>
      <p className="sm:hidden text-sm text-tertiary text-center">
        Use the
        <span className="inline-flex items-center align-middle mx-1 border border-border rounded-md">
          <MenuSmall className="scale-80" />
        </span>
        to navigate around your publication dashboard!
      </p>
    </div>
  );
}
