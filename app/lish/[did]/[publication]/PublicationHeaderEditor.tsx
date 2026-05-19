export function PublicationHeaderEditor(props: {
  iconUrl?: string;
  publicationName: string;
  description?: string;
}) {
  return (
    <div className="pubHeader flex flex-col pb-8 w-full text-center">
      <div className="flex items-center justify-center gap-3">
        {props.iconUrl && (
          <div
            className="shrink-0 w-10 h-10 rounded-full"
            style={{
              backgroundImage: `url(${props.iconUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        )}
        <h2 className="text-accent-contrast sm:text-xl text-[22px]">
          {props.publicationName}
        </h2>
      </div>
      {props.description && (
        <p className="sm:text-lg text-secondary">{props.description}</p>
      )}
    </div>
  );
}
