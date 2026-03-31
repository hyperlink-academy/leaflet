export function ThemeSettings(props: { onOpenTheme: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-bold text-primary">Theme and Layout</h3>
      <button
        type="button"
        className="text-left text-sm text-accent-contrast font-bold hover:underline w-fit"
        onClick={props.onOpenTheme}
      >
        Customize Theme &rarr;
      </button>
    </section>
  );
}
