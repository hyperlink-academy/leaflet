import {
  PubLeafletDocument,
  PubLeafletGraphSubscription,
  PubLeafletPublication,
  PubLeafletComment,
} from "lexicons/api";
import { jsonToLex } from "@atproto/lexicon";
let record = {
  $type: "pub.leaflet.document",
  pages: [
    {
      $type: "pub.leaflet.pages.linearDocument",
      blocks: [
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            $type: "pub.leaflet.blocks.image",
            image: {
              $type: "blob",
              ref: {
                $link:
                  "bafkreih6rv6uonp7by4ig6dezqzg6rdzivwxu54qstfk4jcldids5kvvdm",
              },
              mimeType: "image/jpeg",
              size: 65405,
            },
            aspectRatio: {
              width: 200,
              height: 300,
            },
          },
        },
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            $type: "pub.leaflet.blocks.text",
            facets: [],
            plaintext: "Solid show. Really picks up towards the end.",
          },
        },
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            $type: "pub.leaflet.blocks.text",
            facets: [],
            plaintext: "View more on PopFeed.social",
          },
        },
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            src: "https://popfeed.social/review/at://did:plc:vqqvvqtd2jazpzref6brt3wn/social.popfeed.feed.review/3lz5y7bk3uk2k",
            $type: "pub.leaflet.blocks.website",
            title: "A ★★★½ review of Ironheart (2025)",
            description: "Solid show. Really picks up towards the end. ",
            previewImage: {
              $type: "blob",
              ref: {
                $link:
                  "bafkreibipqciqa7esrjud5a36yr2t5r3xyeftjvceaihnh3bueh3z2q5li",
              },
              mimeType: "image/jpeg",
              size: 1598121,
            },
          },
        },
      ],
    },
  ],
  title: "Ironheart Review",
  author: "did:plc:vqqvvqtd2jazpzref6brt3wn",
  description: "A ★★★½ review of Ironheart (2025)",
  publication:
    "at://did:plc:vqqvvqtd2jazpzref6brt3wn/pub.leaflet.publication/3lyr43jgk7c2p",
  publishedAt: "2025-09-19T04:02:39.923Z",
};

let valid = PubLeafletDocument.validateRecord(jsonToLex(record));
console.log(valid);
