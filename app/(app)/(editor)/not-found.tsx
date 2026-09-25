import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";

// The 404 body for the editor group: /[leaflet_id] calls notFound() for
// unknown or admin-blocked tokens so a miss is a real 404 status rather than
// a 200 with not-found copy in it.
export default function EditorNotFound() {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can&apos;t find this leaflet!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
}
