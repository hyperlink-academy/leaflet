import { AtUri } from "@atproto/syntax";
import { useIdentityData } from "components/IdentityProvider";
import { usePublicationContext } from "components/Providers/PublicationContext";

export const usePublicationRelationship = () => {
  let identity = useIdentityData();
  let publication = usePublicationContext();
  if (!publication.publication) return null;
  let pubUri = new AtUri(publication.publication.uri);
  let isAuthor =
    identity.identity?.atp_did && pubUri.hostname === identity.identity.atp_did;
  let isSubscribed = identity.identity?.subscribers_to_publications.find(
    (p) => p.publication === publication.publication?.uri,
  );
  return { isAuthor, isSubscribed };
};
