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
};

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "leaflet",
  schemas: new EventSchemas().fromRecord<Events>(),
});
