// Same footprint as the composer (input + toolbar row) so what's below
// doesn't jump while the viewer's identity or the editor chunk is loading.
export function ComposerPlaceholder(props: { className?: string }) {
  return (
    <div className="flex flex-col grow">
      <div
        className={`border input-with-border min-h-32 px-2 py-[6px] ${props.className ?? ""}`}
      />
      <div className="pt-1 h-[30px]" />
    </div>
  );
}
