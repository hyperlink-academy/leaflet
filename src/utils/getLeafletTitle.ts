// A leaflet's title is only persisted once it joins a publication or becomes a
// standalone document, so fall through those in the order they're authoritative.
// permission_tokens.title is the last resort and is usually null.
export function getLeafletTitle(permission_token: {
  leaflets_in_publications?: { title: string | null }[] | null;
  leaflets_to_documents?: { title: string | null }[] | null;
  title?: string | null;
}) {
  return (
    permission_token.leaflets_in_publications?.[0]?.title ||
    permission_token.leaflets_to_documents?.[0]?.title ||
    permission_token.title ||
    undefined
  );
}
