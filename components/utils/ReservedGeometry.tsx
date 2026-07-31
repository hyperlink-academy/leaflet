// Published pages are static HTML: they ship the anonymous variant of every
// identity-dependent control and only learn who the viewer is after mount.
// Rendering an inert copy of the variant that needs the most room in the same
// grid cell as the live one pins the box to the height the page was laid out
// around, so nothing above or below can move when identity lands — at any
// viewport, without hardcoded heights that silently rot.
export function ReservedGeometry(props: {
  reserve: React.ReactNode;
  children: React.ReactNode;
  // By default the reserver is laid out at its max-content width and clipped to
  // zero, so it only contributes height: most of these boxes sit in fit-content
  // parents, where a wider reserver would move the control inside it. Set this
  // when the box is full-width regardless and the reserved content wraps — it
  // then has to lay out at the real width to reserve the right height.
  reserveWidth?: boolean;
}) {
  return (
    <div className="grid">
      <div
        className={`[grid-area:1/1] invisible ${props.reserveWidth ? "" : "w-0 overflow-hidden"}`}
        aria-hidden
        inert
      >
        <div className={props.reserveWidth ? "" : "w-max"}>{props.reserve}</div>
      </div>
      <div className="[grid-area:1/1] self-center">{props.children}</div>
    </div>
  );
}
