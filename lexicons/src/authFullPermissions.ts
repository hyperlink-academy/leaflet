import { LexiconDoc } from "@atproto/lexicon";
import { PubLeafletDocument } from "./document";
import {
  PubLeafletPublication,
  PubLeafletPublicationSubscription,
} from "./publication";
import { PubLeafletComment } from "./comment";
import { PubLeafletPollDefinition, PubLeafletPollVote } from "./polls";

export const PubLeafletAuthFullPermissions: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.authFullPermissions",
  defs: {
    main: {
      type: "permission-set",
      title: "Full Leaflet Permissions",
      detail:
        "Manage creating and updating leaflet documents and publications and all interactions on them.",
      permissions: [
        {
          type: "permission",
          resource: "repo",
          action: ["create", "update", "delete"],
          collection: [
            PubLeafletDocument.id,
            PubLeafletPublication.id,
            PubLeafletComment.id,
            PubLeafletPollDefinition.id,
            PubLeafletPollVote.id,
            PubLeafletPublicationSubscription.id,
          ],
        },
      ],
    },
  },
};
