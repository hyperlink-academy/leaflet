export function SettingsPageLayout(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-6 w-full max-w-prose pb-8 ${props.className || ""}`}
    >
      {props.children}
    </div>
  );
}

export function SettingsSection(props: {
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`light-container flex flex-col gap-2 p-3 sm:px-4 ${props.className || ""}`}
    >
      {props.title && (
        <>
          <h3 className="font-bold text-primary flex items-center gap-2">
            {props.title}
          </h3>
          <hr className="-mt-1 mb-2 border-border-light" />
        </>
      )}
      {props.children}
    </div>
  );
}
