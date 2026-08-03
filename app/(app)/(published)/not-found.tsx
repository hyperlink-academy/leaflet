import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";

// The 404 body for every published surface: pages in this group call
// notFound() for genuinely-missing content so a miss is a real 404 status
// rather than a 200 the CDN would happily cache for the revalidate window.
export default function PublishedNotFound() {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can&apos;t find that page!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
}
