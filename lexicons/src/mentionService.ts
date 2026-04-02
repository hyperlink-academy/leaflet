import { LexiconDoc } from "@atproto/lexicon";

export const PagePartsMentionService: LexiconDoc = {
  lexicon: 1,
  id: "parts.page.mention.service",
  defs: {
    main: {
      type: "record",
      key: "any",
      description:
        "Declares a mention service. The did is an XRPC service URL that implements parts.page.mention.search.",
      record: {
        type: "object",
        required: ["name", "did"],
        properties: {
          name: { type: "string", maxLength: 200 },
          description: { type: "string", maxLength: 2000 },
          canBeScopedToDid: { type: "boolean" },
          did: {
            type: "string",
            format: "did",
            description:
              "DID of the service that implements parts.page.mention.search",
          },
        },
      },
    },
  },
};

export const PagePartsMentionSearchService: LexiconDoc = {
  lexicon: 1,
  id: "parts.page.mention.search",
  defs: {
    main: {
      type: "query",
      description:
        "Search a mention service for matching results. A single XRPC host can serve multiple mention services, distinguished by the service AT URI.",
      parameters: {
        type: "params",
        required: ["service", "search"],
        properties: {
          service: {
            type: "string",
            format: "at-uri",
            description:
              "AT URI of the parts.page.mention.service record identifying which service to query",
          },
          search: {
            type: "string",
            description: "Search query string",
          },
          scope: {
            type: "string",
            description:
              "Optional scope identifier to narrow results within a service, as returned by a previous result's subscope.scope field",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            default: 20,
            description: "Maximum number of results to return",
          },
        },
      },
      output: {
        encoding: "application/json",
        schema: {
          type: "object",
          required: ["results"],
          properties: {
            results: {
              type: "array",
              items: { type: "ref", ref: "#result" },
              maxLength: 50,
            },
          },
        },
      },
    },
    result: {
      type: "object",
      required: ["uri", "name"],
      properties: {
        uri: {
          type: "string",
          description: "Identifier for the mentioned entity",
        },
        name: {
          type: "string",
          description: "Display name for the mentioned entity",
        },
        description: {
          type: "string",
          description: "A description for the mentioned entity",
        },
        labels: {
          type: "array",
          items: { type: "ref", ref: "#mentionLabel" },
          description:
            "A set of labels to be rendered with the mentionedEntity",
        },
        href: {
          type: "string",
          format: "uri",
          description: "Optional web URL for the mentioned entity",
        },
        icon: {
          type: "string",
          format: "uri",
          description:
            "Optional icon URL for the mentioned entity, displayed next to the mention",
        },
        embed: {
          type: "ref",
          ref: "#embedInfo",
          description:
            "Optional embed info for creating an embed block instead of an inline mention",
        },
        subscope: {
          type: "ref",
          ref: "#subscopeInfo",
          description:
            "Optional subscope info indicating this result can be scoped into for further searching",
        },
      },
    },
    mentionLabel: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
    },
    embedInfo: {
      type: "object",
      required: ["src"],
      properties: {
        src: {
          type: "string",
          format: "uri",
          description: "Source URL for the iframe embed",
        },
        width: {
          type: "integer",
          minimum: 16,
          maximum: 3200,
          description: "Default width of the embed in pixels",
        },
        height: {
          type: "integer",
          minimum: 16,
          maximum: 3200,
          description: "Default height of the embed in pixels",
        },
        aspectRatio: {
          type: "ref",
          ref: "#aspectRatio",
          description:
            "Aspect ratio of the embed. If provided, takes precedence over width/height for sizing.",
        },
      },
    },
    aspectRatio: {
      type: "object",
      required: ["width", "height"],
      properties: {
        width: { type: "integer" },
        height: { type: "integer" },
      },
    },
    subscopeInfo: {
      type: "object",
      required: ["scope", "label"],
      properties: {
        scope: {
          type: "string",
          description:
            "Scope identifier passed back to the service in subsequent search queries",
        },
        label: {
          type: "string",
          maxLength: 100,
          description:
            "Display label for the scope-down button (e.g. 'Posts', 'Tracks')",
        },
      },
    },
  },
};

export const PagePartsMentionConfig: LexiconDoc = {
  lexicon: 1,
  id: "parts.page.mention.config",
  defs: {
    main: {
      type: "record",
      key: "literal:self",
      description:
        "User's configured mention services. Singleton record per user.",
      record: {
        type: "object",
        required: ["services"],
        properties: {
          services: {
            type: "array",
            items: { type: "string", format: "at-uri" },
            maxLength: 50,
            description:
              "AT URIs of parts.page.mention.service records the user has enabled",
          },
        },
      },
    },
  },
};
