import { Inngest } from "inngest";

import { EventSchemas } from "inngest";

export type Events = {
  "feeds/index-follows": {
    data: {
      did: string;
    };
  };
  "appview/profile-update": {
    data: {
      record: any;
      did: string;
    };
  };
  "appview/index-bsky-post-mention": {
    data: {
      post_uri: string;
      document_link: string;
    };
  };
  "appview/come-online": { data: {} };
  "user/migrate-to-standard": {
    data: {
      did: string;
    };
  };
  "user/cleanup-expired-oauth-sessions": {
    data: {};
  };
  "user/check-oauth-session": {
    data: {
      identityId: string;
      did: string;
      tokenCount: number;
    };
  };
  "documents/fix-publication-references": {
    data: {
      documentUris: string[];
    };
  };
  "documents/fix-incorrect-site-values": {
    data: {
      did: string;
    };
  };
  "documents/fix-postref": {
    data: {
      documentUris?: string[];
    };
  };
  "appview/sync-bsky-likes": {
    data: {
      document_uri: string;
      bsky_post_uri: string;
    };
  };
  "user/write-records-to-pds": {
    data: {
      did: string;
      records: Array<{
        collection: string;
        rkey: string;
        record: unknown;
      }>;
    };
  };
};

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "leaflet",
  schemas: new EventSchemas().fromRecord<Events>(),
});
