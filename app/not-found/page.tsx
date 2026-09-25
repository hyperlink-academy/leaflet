import { notFound } from "next/navigation";

// Kept as a real route because middleware rewrites unmatched custom-domain
// paths here and old links point at it directly. Throwing notFound() renders
// the root not-found UI with an actual 404 status (which also gets an
// automatic robots noindex) instead of an indexable 200.
export default function NotFoundRoute() {
  notFound();
}
