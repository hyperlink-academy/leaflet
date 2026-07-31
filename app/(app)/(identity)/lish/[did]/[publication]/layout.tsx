// The identity-gated pub surfaces (dashboard, edit, theme-settings, join,
// contributor_accept) share the published pub tree's metadata — pub name as
// tab title, pub icon as favicon — without sharing its route group, so the
// published group stays free of request-coupled reads.
export { generateMetadata } from "app/(app)/(published)/lish/[did]/[publication]/layout";

export default function PublicationIdentityLayout(props: {
  children: React.ReactNode;
}) {
  return <>{props.children}</>;
}
