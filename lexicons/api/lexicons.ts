/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util'

export const schemaDict = {
  AppBskyActorProfile: {
    lexicon: 1,
    id: 'app.bsky.actor.profile',
    defs: {
      main: {
        type: 'record',
        description: 'A declaration of a Bluesky account profile.',
        key: 'literal:self',
        record: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              maxGraphemes: 64,
              maxLength: 640,
            },
            description: {
              type: 'string',
              description: 'Free-form profile description text.',
              maxGraphemes: 256,
              maxLength: 2560,
            },
            avatar: {
              type: 'blob',
              description:
                "Small image to be displayed next to posts from account. AKA, 'profile picture'",
              accept: ['image/png', 'image/jpeg'],
              maxSize: 1000000,
            },
            banner: {
              type: 'blob',
              description:
                'Larger horizontal image to display behind profile view.',
              accept: ['image/png', 'image/jpeg'],
              maxSize: 1000000,
            },
            labels: {
              type: 'union',
              description:
                'Self-label values, specific to the Bluesky application, on the overall account.',
              refs: ['lex:com.atproto.label.defs#selfLabels'],
            },
            joinedViaStarterPack: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            pinnedPost: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  ComAtprotoLabelDefs: {
    lexicon: 1,
    id: 'com.atproto.label.defs',
    defs: {
      label: {
        type: 'object',
        description:
          'Metadata tag on an atproto resource (eg, repo or record).',
        required: ['src', 'uri', 'val', 'cts'],
        properties: {
          ver: {
            type: 'integer',
            description: 'The AT Protocol version of the label object.',
          },
          src: {
            type: 'string',
            format: 'did',
            description: 'DID of the actor who created this label.',
          },
          uri: {
            type: 'string',
            format: 'uri',
            description:
              'AT URI of the record, repository (account), or other resource that this label applies to.',
          },
          cid: {
            type: 'string',
            format: 'cid',
            description:
              "Optionally, CID specifying the specific version of 'uri' resource this label applies to.",
          },
          val: {
            type: 'string',
            maxLength: 128,
            description:
              'The short string name of the value or type of this label.',
          },
          neg: {
            type: 'boolean',
            description:
              'If true, this is a negation label, overwriting a previous label.',
          },
          cts: {
            type: 'string',
            format: 'datetime',
            description: 'Timestamp when this label was created.',
          },
          exp: {
            type: 'string',
            format: 'datetime',
            description:
              'Timestamp at which this label expires (no longer applies).',
          },
          sig: {
            type: 'bytes',
            description: 'Signature of dag-cbor encoded label.',
          },
        },
      },
      selfLabels: {
        type: 'object',
        description:
          'Metadata tags on an atproto record, published by the author within the record.',
        required: ['values'],
        properties: {
          values: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:com.atproto.label.defs#selfLabel',
            },
            maxLength: 10,
          },
        },
      },
      selfLabel: {
        type: 'object',
        description:
          'Metadata tag on an atproto record, published by the author within the record. Note that schemas should use #selfLabels, not #selfLabel.',
        required: ['val'],
        properties: {
          val: {
            type: 'string',
            maxLength: 128,
            description:
              'The short string name of the value or type of this label.',
          },
        },
      },
      labelValueDefinition: {
        type: 'object',
        description:
          'Declares a label value and its expected interpretations and behaviors.',
        required: ['identifier', 'severity', 'blurs', 'locales'],
        properties: {
          identifier: {
            type: 'string',
            description:
              "The value of the label being defined. Must only include lowercase ascii and the '-' character ([a-z-]+).",
            maxLength: 100,
            maxGraphemes: 100,
          },
          severity: {
            type: 'string',
            description:
              "How should a client visually convey this label? 'inform' means neutral and informational; 'alert' means negative and warning; 'none' means show nothing.",
            knownValues: ['inform', 'alert', 'none'],
          },
          blurs: {
            type: 'string',
            description:
              "What should this label hide in the UI, if applied? 'content' hides all of the target; 'media' hides the images/video/audio; 'none' hides nothing.",
            knownValues: ['content', 'media', 'none'],
          },
          defaultSetting: {
            type: 'string',
            description: 'The default setting for this label.',
            knownValues: ['ignore', 'warn', 'hide'],
            default: 'warn',
          },
          adultOnly: {
            type: 'boolean',
            description:
              'Does the user need to have adult content enabled in order to configure this label?',
          },
          locales: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:com.atproto.label.defs#labelValueDefinitionStrings',
            },
          },
        },
      },
      labelValueDefinitionStrings: {
        type: 'object',
        description:
          'Strings which describe the label in the UI, localized into a specific language.',
        required: ['lang', 'name', 'description'],
        properties: {
          lang: {
            type: 'string',
            description:
              'The code of the language these strings are written in.',
            format: 'language',
          },
          name: {
            type: 'string',
            description: 'A short human-readable name for the label.',
            maxGraphemes: 64,
            maxLength: 640,
          },
          description: {
            type: 'string',
            description:
              'A longer description of what the label means and why it might be applied.',
            maxGraphemes: 10000,
            maxLength: 100000,
          },
        },
      },
      labelValue: {
        type: 'string',
        knownValues: [
          '!hide',
          '!no-promote',
          '!warn',
          '!no-unauthenticated',
          'dmca-violation',
          'doxxing',
          'porn',
          'sexual',
          'nudity',
          'nsfl',
          'gore',
        ],
      },
    },
  },
  ComAtprotoRepoApplyWrites: {
    lexicon: 1,
    id: 'com.atproto.repo.applyWrites',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Apply a batch transaction of repository creates, updates, and deletes. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'writes'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data across all operations, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              writes: {
                type: 'array',
                items: {
                  type: 'union',
                  refs: [
                    'lex:com.atproto.repo.applyWrites#create',
                    'lex:com.atproto.repo.applyWrites#update',
                    'lex:com.atproto.repo.applyWrites#delete',
                  ],
                  closed: true,
                },
              },
              swapCommit: {
                type: 'string',
                description:
                  'If provided, the entire operation will fail if the current repo commit CID does not match this value. Used to prevent conflicting repo mutations.',
                format: 'cid',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [],
            properties: {
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              results: {
                type: 'array',
                items: {
                  type: 'union',
                  refs: [
                    'lex:com.atproto.repo.applyWrites#createResult',
                    'lex:com.atproto.repo.applyWrites#updateResult',
                    'lex:com.atproto.repo.applyWrites#deleteResult',
                  ],
                  closed: true,
                },
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
            description:
              "Indicates that the 'swapCommit' parameter did not match current commit.",
          },
        ],
      },
      create: {
        type: 'object',
        description: 'Operation which creates a new record.',
        required: ['collection', 'value'],
        properties: {
          collection: {
            type: 'string',
            format: 'nsid',
          },
          rkey: {
            type: 'string',
            maxLength: 512,
            format: 'record-key',
            description:
              'NOTE: maxLength is redundant with record-key format. Keeping it temporarily to ensure backwards compatibility.',
          },
          value: {
            type: 'unknown',
          },
        },
      },
      update: {
        type: 'object',
        description: 'Operation which updates an existing record.',
        required: ['collection', 'rkey', 'value'],
        properties: {
          collection: {
            type: 'string',
            format: 'nsid',
          },
          rkey: {
            type: 'string',
            format: 'record-key',
          },
          value: {
            type: 'unknown',
          },
        },
      },
      delete: {
        type: 'object',
        description: 'Operation which deletes an existing record.',
        required: ['collection', 'rkey'],
        properties: {
          collection: {
            type: 'string',
            format: 'nsid',
          },
          rkey: {
            type: 'string',
            format: 'record-key',
          },
        },
      },
      createResult: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          validationStatus: {
            type: 'string',
            knownValues: ['valid', 'unknown'],
          },
        },
      },
      updateResult: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          validationStatus: {
            type: 'string',
            knownValues: ['valid', 'unknown'],
          },
        },
      },
      deleteResult: {
        type: 'object',
        required: [],
        properties: {},
      },
    },
  },
  ComAtprotoRepoCreateRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.createRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Create a single new repository record. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'record'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
                maxLength: 512,
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              record: {
                type: 'unknown',
                description: 'The record itself. Must contain a $type field.',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              validationStatus: {
                type: 'string',
                knownValues: ['valid', 'unknown'],
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
            description:
              "Indicates that 'swapCommit' didn't match current repo commit.",
          },
        ],
      },
    },
  },
  ComAtprotoRepoDefs: {
    lexicon: 1,
    id: 'com.atproto.repo.defs',
    defs: {
      commitMeta: {
        type: 'object',
        required: ['cid', 'rev'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          rev: {
            type: 'string',
            format: 'tid',
          },
        },
      },
    },
  },
  ComAtprotoRepoDeleteRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.deleteRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          "Delete a repository record, or ensure it doesn't exist. Requires auth, implemented by PDS.",
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'rkey'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
              },
              swapRecord: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous record by CID.',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
          },
        ],
      },
    },
  },
  ComAtprotoRepoDescribeRepo: {
    lexicon: 1,
    id: 'com.atproto.repo.describeRepo',
    defs: {
      main: {
        type: 'query',
        description:
          'Get information about an account and repository, including the list of collections. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'handle',
              'did',
              'didDoc',
              'collections',
              'handleIsCorrect',
            ],
            properties: {
              handle: {
                type: 'string',
                format: 'handle',
              },
              did: {
                type: 'string',
                format: 'did',
              },
              didDoc: {
                type: 'unknown',
                description: 'The complete DID document for this account.',
              },
              collections: {
                type: 'array',
                description:
                  'List of all the collections (NSIDs) for which this repo contains at least one record.',
                items: {
                  type: 'string',
                  format: 'nsid',
                },
              },
              handleIsCorrect: {
                type: 'boolean',
                description:
                  'Indicates if handle is currently valid (resolves bi-directionally)',
              },
            },
          },
        },
      },
    },
  },
  ComAtprotoRepoGetRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.getRecord',
    defs: {
      main: {
        type: 'query',
        description:
          'Get a single record from a repository. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo', 'collection', 'rkey'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
            collection: {
              type: 'string',
              format: 'nsid',
              description: 'The NSID of the record collection.',
            },
            rkey: {
              type: 'string',
              description: 'The Record Key.',
              format: 'record-key',
            },
            cid: {
              type: 'string',
              format: 'cid',
              description:
                'The CID of the version of the record. If not specified, then return the most recent version.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'unknown',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  ComAtprotoRepoImportRepo: {
    lexicon: 1,
    id: 'com.atproto.repo.importRepo',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Import a repo in the form of a CAR file. Requires Content-Length HTTP header to be set.',
        input: {
          encoding: 'application/vnd.ipld.car',
        },
      },
    },
  },
  ComAtprotoRepoListMissingBlobs: {
    lexicon: 1,
    id: 'com.atproto.repo.listMissingBlobs',
    defs: {
      main: {
        type: 'query',
        description:
          'Returns a list of missing blobs for the requesting account. Intended to be used in the account migration flow.',
        parameters: {
          type: 'params',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              default: 500,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['blobs'],
            properties: {
              cursor: {
                type: 'string',
              },
              blobs: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:com.atproto.repo.listMissingBlobs#recordBlob',
                },
              },
            },
          },
        },
      },
      recordBlob: {
        type: 'object',
        required: ['cid', 'recordUri'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          recordUri: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
  },
  ComAtprotoRepoListRecords: {
    lexicon: 1,
    id: 'com.atproto.repo.listRecords',
    defs: {
      main: {
        type: 'query',
        description:
          'List a range of records in a repository, matching a specific collection. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo', 'collection'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
            collection: {
              type: 'string',
              format: 'nsid',
              description: 'The NSID of the record type.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'The number of records to return.',
            },
            cursor: {
              type: 'string',
            },
            rkeyStart: {
              type: 'string',
              description:
                'DEPRECATED: The lowest sort-ordered rkey to start from (exclusive)',
            },
            rkeyEnd: {
              type: 'string',
              description:
                'DEPRECATED: The highest sort-ordered rkey to stop at (exclusive)',
            },
            reverse: {
              type: 'boolean',
              description: 'Flag to reverse the order of the returned records.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:com.atproto.repo.listRecords#record',
                },
              },
            },
          },
        },
      },
      record: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'unknown',
          },
        },
      },
    },
  },
  ComAtprotoRepoPutRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.putRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Write a repository record, creating or updating it as needed. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'rkey', 'record'],
            nullable: ['swapRecord'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
                maxLength: 512,
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              record: {
                type: 'unknown',
                description: 'The record to write.',
              },
              swapRecord: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous record by CID. WARNING: nullable and optional field; may cause problems with golang implementation',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              validationStatus: {
                type: 'string',
                knownValues: ['valid', 'unknown'],
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
          },
        ],
      },
    },
  },
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: 'com.atproto.repo.strongRef',
    description: 'A URI with a content-hash fingerprint.',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
        },
      },
    },
  },
  ComAtprotoRepoUploadBlob: {
    lexicon: 1,
    id: 'com.atproto.repo.uploadBlob',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Upload a new blob, to be referenced from a repository record. The blob will be deleted if it is not referenced within a time window (eg, minutes). Blob restrictions (mimetype, size, etc) are enforced when the reference is created. Requires auth, implemented by PDS.',
        input: {
          encoding: '*/*',
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['blob'],
            properties: {
              blob: {
                type: 'blob',
              },
            },
          },
        },
      },
    },
  },
  PubLeafletBlocksBlockquote: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.blockquote',
    defs: {
      main: {
        type: 'object',
        required: ['plaintext'],
        properties: {
          plaintext: {
            type: 'string',
          },
          facets: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.richtext.facet',
            },
          },
        },
      },
    },
  },
  PubLeafletBlocksBskyPost: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.bskyPost',
    defs: {
      main: {
        type: 'object',
        required: ['postRef'],
        properties: {
          postRef: {
            type: 'ref',
            ref: 'lex:com.atproto.repo.strongRef',
          },
        },
      },
    },
  },
  PubLeafletBlocksButton: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.button',
    defs: {
      main: {
        type: 'object',
        required: ['text', 'url'],
        properties: {
          text: {
            type: 'string',
          },
          url: {
            type: 'string',
            format: 'uri',
          },
        },
      },
    },
  },
  PubLeafletBlocksCode: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.code',
    defs: {
      main: {
        type: 'object',
        required: ['plaintext'],
        properties: {
          plaintext: {
            type: 'string',
          },
          language: {
            type: 'string',
          },
          syntaxHighlightingTheme: {
            type: 'string',
          },
        },
      },
    },
  },
  PubLeafletBlocksHeader: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.header',
    defs: {
      main: {
        type: 'object',
        required: ['plaintext'],
        properties: {
          level: {
            type: 'integer',
            minimum: 1,
            maximum: 6,
          },
          plaintext: {
            type: 'string',
          },
          facets: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.richtext.facet',
            },
          },
        },
      },
    },
  },
  PubLeafletBlocksHorizontalRule: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.horizontalRule',
    defs: {
      main: {
        type: 'object',
        required: [],
        properties: {},
      },
    },
  },
  PubLeafletBlocksIframe: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.iframe',
    defs: {
      main: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
          },
          height: {
            type: 'integer',
            minimum: 16,
            maximum: 1600,
          },
        },
      },
    },
  },
  PubLeafletBlocksImage: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.image',
    defs: {
      main: {
        type: 'object',
        required: ['image', 'aspectRatio'],
        properties: {
          image: {
            type: 'blob',
            accept: ['image/*'],
            maxSize: 1000000,
          },
          alt: {
            type: 'string',
            description:
              'Alt text description of the image, for accessibility.',
          },
          aspectRatio: {
            type: 'ref',
            ref: 'lex:pub.leaflet.blocks.image#aspectRatio',
          },
        },
      },
      aspectRatio: {
        type: 'object',
        required: ['width', 'height'],
        properties: {
          width: {
            type: 'integer',
          },
          height: {
            type: 'integer',
          },
        },
      },
    },
  },
  PubLeafletBlocksMath: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.math',
    defs: {
      main: {
        type: 'object',
        required: ['tex'],
        properties: {
          tex: {
            type: 'string',
          },
        },
      },
    },
  },
  PubLeafletBlocksOrderedList: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.orderedList',
    defs: {
      main: {
        type: 'object',
        required: ['children'],
        properties: {
          startIndex: {
            type: 'integer',
            description:
              'The starting number for this ordered list. Defaults to 1 if not specified.',
          },
          children: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.blocks.orderedList#listItem',
            },
          },
        },
      },
      listItem: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.blocks.text',
              'lex:pub.leaflet.blocks.header',
              'lex:pub.leaflet.blocks.image',
            ],
          },
          children: {
            type: 'array',
            description:
              'Nested ordered list items. Mutually exclusive with unorderedListChildren; if both are present, children takes precedence.',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.blocks.orderedList#listItem',
            },
          },
          unorderedListChildren: {
            type: 'ref',
            description:
              'A nested unordered list. Mutually exclusive with children; if both are present, children takes precedence.',
            ref: 'lex:pub.leaflet.blocks.unorderedList',
          },
        },
      },
    },
  },
  PubLeafletBlocksPage: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.page',
    defs: {
      main: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
          },
        },
      },
    },
  },
  PubLeafletBlocksPoll: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.poll',
    defs: {
      main: {
        type: 'object',
        required: ['pollRef'],
        properties: {
          pollRef: {
            type: 'ref',
            ref: 'lex:com.atproto.repo.strongRef',
          },
        },
      },
    },
  },
  PubLeafletBlocksText: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.text',
    defs: {
      main: {
        type: 'object',
        required: ['plaintext'],
        properties: {
          plaintext: {
            type: 'string',
          },
          textSize: {
            type: 'string',
            enum: ['default', 'small', 'large'],
          },
          facets: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.richtext.facet',
            },
          },
        },
      },
    },
  },
  PubLeafletBlocksUnorderedList: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.unorderedList',
    defs: {
      main: {
        type: 'object',
        required: ['children'],
        properties: {
          children: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.blocks.unorderedList#listItem',
            },
          },
        },
      },
      listItem: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.blocks.text',
              'lex:pub.leaflet.blocks.header',
              'lex:pub.leaflet.blocks.image',
            ],
          },
          children: {
            type: 'array',
            description:
              'Nested unordered list items. Mutually exclusive with orderedListChildren; if both are present, children takes precedence.',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.blocks.unorderedList#listItem',
            },
          },
          orderedListChildren: {
            type: 'ref',
            description:
              'Nested ordered list items. Mutually exclusive with children; if both are present, children takes precedence.',
            ref: 'lex:pub.leaflet.blocks.orderedList',
          },
        },
      },
    },
  },
  PubLeafletBlocksWebsite: {
    lexicon: 1,
    id: 'pub.leaflet.blocks.website',
    defs: {
      main: {
        type: 'object',
        required: ['src'],
        properties: {
          previewImage: {
            type: 'blob',
            accept: ['image/*'],
            maxSize: 1000000,
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          src: {
            type: 'string',
            format: 'uri',
          },
        },
      },
    },
  },
  PubLeafletComment: {
    lexicon: 1,
    id: 'pub.leaflet.comment',
    revision: 1,
    description: 'A lexicon for comments on documents',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record containing a comment',
        record: {
          type: 'object',
          required: ['subject', 'plaintext', 'createdAt'],
          properties: {
            subject: {
              type: 'string',
              format: 'at-uri',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            reply: {
              type: 'ref',
              ref: 'lex:pub.leaflet.comment#replyRef',
            },
            plaintext: {
              type: 'string',
            },
            facets: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:pub.leaflet.richtext.facet',
              },
            },
            onPage: {
              type: 'string',
            },
            attachment: {
              type: 'union',
              refs: ['lex:pub.leaflet.comment#linearDocumentQuote'],
            },
          },
        },
      },
      linearDocumentQuote: {
        type: 'object',
        required: ['document', 'quote'],
        properties: {
          document: {
            type: 'string',
            format: 'at-uri',
          },
          quote: {
            type: 'ref',
            ref: 'lex:pub.leaflet.pages.linearDocument#quote',
          },
        },
      },
      replyRef: {
        type: 'object',
        required: ['parent'],
        properties: {
          parent: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
  },
  PubLeafletContent: {
    lexicon: 1,
    id: 'pub.leaflet.content',
    revision: 1,
    description: 'A lexicon for long form rich media documents',
    defs: {
      main: {
        type: 'object',
        description: 'Content format for leaflet documents',
        required: ['pages'],
        properties: {
          pages: {
            type: 'array',
            items: {
              type: 'union',
              refs: [
                'lex:pub.leaflet.pages.linearDocument',
                'lex:pub.leaflet.pages.canvas',
              ],
            },
          },
        },
      },
    },
  },
  PubLeafletDocument: {
    lexicon: 1,
    id: 'pub.leaflet.document',
    revision: 1,
    description: 'A lexicon for long form rich media documents',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record containing a document',
        record: {
          type: 'object',
          required: ['pages', 'author', 'title'],
          properties: {
            title: {
              type: 'string',
              maxLength: 5000,
              maxGraphemes: 500,
            },
            postRef: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            description: {
              type: 'string',
              maxLength: 30000,
              maxGraphemes: 3000,
            },
            publishedAt: {
              type: 'string',
              format: 'datetime',
            },
            publication: {
              type: 'string',
              format: 'at-uri',
            },
            author: {
              type: 'string',
              format: 'at-identifier',
            },
            theme: {
              type: 'ref',
              ref: 'lex:pub.leaflet.publication#theme',
            },
            preferences: {
              type: 'ref',
              ref: 'lex:pub.leaflet.publication#preferences',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 50,
              },
            },
            coverImage: {
              type: 'blob',
              accept: ['image/png', 'image/jpeg', 'image/webp'],
              maxSize: 1000000,
            },
            pages: {
              type: 'array',
              items: {
                type: 'union',
                refs: [
                  'lex:pub.leaflet.pages.linearDocument',
                  'lex:pub.leaflet.pages.canvas',
                ],
              },
            },
          },
        },
      },
    },
  },
  PubLeafletGraphSubscription: {
    lexicon: 1,
    id: 'pub.leaflet.graph.subscription',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record declaring a subscription to a publication',
        record: {
          type: 'object',
          required: ['publication'],
          properties: {
            publication: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
      },
    },
  },
  PubLeafletInteractionsRecommend: {
    lexicon: 1,
    id: 'pub.leaflet.interactions.recommend',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record representing a recommend on a document',
        record: {
          type: 'object',
          required: ['subject', 'createdAt'],
          properties: {
            subject: {
              type: 'string',
              format: 'at-uri',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLeafletPagesCanvas: {
    lexicon: 1,
    id: 'pub.leaflet.pages.canvas',
    defs: {
      main: {
        type: 'object',
        required: ['blocks'],
        properties: {
          id: {
            type: 'string',
          },
          blocks: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.pages.canvas#block',
            },
          },
        },
      },
      block: {
        type: 'object',
        required: ['block', 'x', 'y', 'width'],
        properties: {
          block: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.blocks.iframe',
              'lex:pub.leaflet.blocks.text',
              'lex:pub.leaflet.blocks.blockquote',
              'lex:pub.leaflet.blocks.header',
              'lex:pub.leaflet.blocks.image',
              'lex:pub.leaflet.blocks.unorderedList',
              'lex:pub.leaflet.blocks.orderedList',
              'lex:pub.leaflet.blocks.website',
              'lex:pub.leaflet.blocks.math',
              'lex:pub.leaflet.blocks.code',
              'lex:pub.leaflet.blocks.horizontalRule',
              'lex:pub.leaflet.blocks.bskyPost',
              'lex:pub.leaflet.blocks.page',
              'lex:pub.leaflet.blocks.poll',
              'lex:pub.leaflet.blocks.button',
            ],
          },
          x: {
            type: 'integer',
          },
          y: {
            type: 'integer',
          },
          width: {
            type: 'integer',
          },
          height: {
            type: 'integer',
          },
          rotation: {
            type: 'integer',
            description: 'The rotation of the block in degrees',
          },
        },
      },
      textAlignLeft: {
        type: 'token',
      },
      textAlignCenter: {
        type: 'token',
      },
      textAlignRight: {
        type: 'token',
      },
      quote: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: {
            type: 'ref',
            ref: 'lex:pub.leaflet.pages.canvas#position',
          },
          end: {
            type: 'ref',
            ref: 'lex:pub.leaflet.pages.canvas#position',
          },
        },
      },
      position: {
        type: 'object',
        required: ['block', 'offset'],
        properties: {
          block: {
            type: 'array',
            items: {
              type: 'integer',
            },
          },
          offset: {
            type: 'integer',
          },
        },
      },
    },
  },
  PubLeafletPagesLinearDocument: {
    lexicon: 1,
    id: 'pub.leaflet.pages.linearDocument',
    defs: {
      main: {
        type: 'object',
        required: ['blocks'],
        properties: {
          id: {
            type: 'string',
          },
          blocks: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:pub.leaflet.pages.linearDocument#block',
            },
          },
        },
      },
      block: {
        type: 'object',
        required: ['block'],
        properties: {
          block: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.blocks.iframe',
              'lex:pub.leaflet.blocks.text',
              'lex:pub.leaflet.blocks.blockquote',
              'lex:pub.leaflet.blocks.header',
              'lex:pub.leaflet.blocks.image',
              'lex:pub.leaflet.blocks.unorderedList',
              'lex:pub.leaflet.blocks.orderedList',
              'lex:pub.leaflet.blocks.website',
              'lex:pub.leaflet.blocks.math',
              'lex:pub.leaflet.blocks.code',
              'lex:pub.leaflet.blocks.horizontalRule',
              'lex:pub.leaflet.blocks.bskyPost',
              'lex:pub.leaflet.blocks.page',
              'lex:pub.leaflet.blocks.poll',
              'lex:pub.leaflet.blocks.button',
            ],
          },
          alignment: {
            type: 'string',
            knownValues: [
              'lex:pub.leaflet.pages.linearDocument#textAlignLeft',
              'lex:pub.leaflet.pages.linearDocument#textAlignCenter',
              'lex:pub.leaflet.pages.linearDocument#textAlignRight',
              'lex:pub.leaflet.pages.linearDocument#textAlignJustify',
            ],
          },
        },
      },
      textAlignLeft: {
        type: 'token',
      },
      textAlignCenter: {
        type: 'token',
      },
      textAlignRight: {
        type: 'token',
      },
      textAlignJustify: {
        type: 'token',
      },
      quote: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: {
            type: 'ref',
            ref: 'lex:pub.leaflet.pages.linearDocument#position',
          },
          end: {
            type: 'ref',
            ref: 'lex:pub.leaflet.pages.linearDocument#position',
          },
        },
      },
      position: {
        type: 'object',
        required: ['block', 'offset'],
        properties: {
          block: {
            type: 'array',
            items: {
              type: 'integer',
            },
          },
          offset: {
            type: 'integer',
          },
        },
      },
    },
  },
  PubLeafletPollDefinition: {
    lexicon: 1,
    id: 'pub.leaflet.poll.definition',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record declaring a poll',
        record: {
          type: 'object',
          required: ['name', 'options'],
          properties: {
            name: {
              type: 'string',
              maxLength: 500,
              maxGraphemes: 100,
            },
            options: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:pub.leaflet.poll.definition#option',
              },
            },
            endDate: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
      option: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            maxLength: 500,
            maxGraphemes: 50,
          },
        },
      },
    },
  },
  PubLeafletPollVote: {
    lexicon: 1,
    id: 'pub.leaflet.poll.vote',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record declaring a vote on a poll',
        record: {
          type: 'object',
          required: ['poll', 'option'],
          properties: {
            poll: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            option: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  },
  PubLeafletPublication: {
    lexicon: 1,
    id: 'pub.leaflet.publication',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'Record declaring a publication',
        record: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              maxLength: 2000,
            },
            base_path: {
              type: 'string',
            },
            description: {
              type: 'string',
              maxLength: 2000,
            },
            icon: {
              type: 'blob',
              accept: ['image/*'],
              maxSize: 1000000,
            },
            theme: {
              type: 'ref',
              ref: 'lex:pub.leaflet.publication#theme',
            },
            preferences: {
              type: 'ref',
              ref: 'lex:pub.leaflet.publication#preferences',
            },
          },
        },
      },
      preferences: {
        type: 'object',
        properties: {
          showInDiscover: {
            type: 'boolean',
            default: true,
          },
          showComments: {
            type: 'boolean',
            default: true,
          },
          showMentions: {
            type: 'boolean',
            default: true,
          },
          showPrevNext: {
            type: 'boolean',
            default: true,
          },
          showRecommends: {
            type: 'boolean',
            default: true,
          },
        },
      },
      theme: {
        type: 'object',
        properties: {
          backgroundColor: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.theme.color#rgba',
              'lex:pub.leaflet.theme.color#rgb',
            ],
          },
          backgroundImage: {
            type: 'ref',
            ref: 'lex:pub.leaflet.theme.backgroundImage',
          },
          pageWidth: {
            type: 'integer',
            minimum: 0,
            maximum: 1600,
          },
          primary: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.theme.color#rgba',
              'lex:pub.leaflet.theme.color#rgb',
            ],
          },
          pageBackground: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.theme.color#rgba',
              'lex:pub.leaflet.theme.color#rgb',
            ],
          },
          showPageBackground: {
            type: 'boolean',
            default: false,
          },
          accentBackground: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.theme.color#rgba',
              'lex:pub.leaflet.theme.color#rgb',
            ],
          },
          accentText: {
            type: 'union',
            refs: [
              'lex:pub.leaflet.theme.color#rgba',
              'lex:pub.leaflet.theme.color#rgb',
            ],
          },
        },
      },
    },
  },
  PubLeafletRichtextFacet: {
    lexicon: 1,
    id: 'pub.leaflet.richtext.facet',
    defs: {
      main: {
        type: 'object',
        description: 'Annotation of a sub-string within rich text.',
        required: ['index', 'features'],
        properties: {
          index: {
            type: 'ref',
            ref: 'lex:pub.leaflet.richtext.facet#byteSlice',
          },
          features: {
            type: 'array',
            items: {
              type: 'union',
              refs: [
                'lex:pub.leaflet.richtext.facet#link',
                'lex:pub.leaflet.richtext.facet#didMention',
                'lex:pub.leaflet.richtext.facet#atMention',
                'lex:pub.leaflet.richtext.facet#code',
                'lex:pub.leaflet.richtext.facet#highlight',
                'lex:pub.leaflet.richtext.facet#underline',
                'lex:pub.leaflet.richtext.facet#strikethrough',
                'lex:pub.leaflet.richtext.facet#id',
                'lex:pub.leaflet.richtext.facet#bold',
                'lex:pub.leaflet.richtext.facet#italic',
              ],
            },
          },
        },
      },
      byteSlice: {
        type: 'object',
        description:
          'Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets.',
        required: ['byteStart', 'byteEnd'],
        properties: {
          byteStart: {
            type: 'integer',
            minimum: 0,
          },
          byteEnd: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
      link: {
        type: 'object',
        description:
          'Facet feature for a URL. The text URL may have been simplified or truncated, but the facet reference should be a complete URL.',
        required: ['uri'],
        properties: {
          uri: {
            type: 'string',
          },
        },
      },
      didMention: {
        type: 'object',
        description: 'Facet feature for mentioning a did.',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
        },
      },
      atMention: {
        type: 'object',
        description: 'Facet feature for mentioning an AT URI.',
        required: ['atURI'],
        properties: {
          atURI: {
            type: 'string',
            format: 'uri',
          },
        },
      },
      code: {
        type: 'object',
        description: 'Facet feature for inline code.',
        required: [],
        properties: {},
      },
      highlight: {
        type: 'object',
        description: 'Facet feature for highlighted text.',
        required: [],
        properties: {},
      },
      underline: {
        type: 'object',
        description: 'Facet feature for underline markup',
        required: [],
        properties: {},
      },
      strikethrough: {
        type: 'object',
        description: 'Facet feature for strikethrough markup',
        required: [],
        properties: {},
      },
      id: {
        type: 'object',
        description:
          'Facet feature for an identifier. Used for linking to a segment',
        required: [],
        properties: {
          id: {
            type: 'string',
          },
        },
      },
      bold: {
        type: 'object',
        description: 'Facet feature for bold text',
        required: [],
        properties: {},
      },
      italic: {
        type: 'object',
        description: 'Facet feature for italic text',
        required: [],
        properties: {},
      },
    },
  },
  PubLeafletThemeBackgroundImage: {
    lexicon: 1,
    id: 'pub.leaflet.theme.backgroundImage',
    defs: {
      main: {
        type: 'object',
        required: ['image'],
        properties: {
          image: {
            type: 'blob',
            accept: ['image/*'],
            maxSize: 1000000,
          },
          width: {
            type: 'integer',
          },
          repeat: {
            type: 'boolean',
          },
        },
      },
    },
  },
  PubLeafletThemeColor: {
    lexicon: 1,
    id: 'pub.leaflet.theme.color',
    defs: {
      rgba: {
        type: 'object',
        required: ['r', 'g', 'b', 'a'],
        properties: {
          r: {
            type: 'integer',
            maximum: 255,
            minimum: 0,
          },
          g: {
            type: 'integer',
            maximum: 255,
            minimum: 0,
          },
          b: {
            type: 'integer',
            maximum: 255,
            minimum: 0,
          },
          a: {
            type: 'integer',
            maximum: 100,
            minimum: 0,
          },
        },
      },
      rgb: {
        type: 'object',
        required: ['r', 'g', 'b'],
        properties: {
          r: {
            type: 'integer',
            maximum: 255,
            minimum: 0,
          },
          g: {
            type: 'integer',
            maximum: 255,
            minimum: 0,
          },
          b: {
            type: 'integer',
            maximum: 255,
            minimum: 0,
          },
        },
      },
    },
  },
  SiteStandardDocument: {
    defs: {
      main: {
        key: 'tid',
        record: {
          properties: {
            bskyPostRef: {
              ref: 'lex:com.atproto.repo.strongRef',
              type: 'ref',
            },
            content: {
              closed: false,
              refs: ['lex:pub.leaflet.content'],
              type: 'union',
            },
            coverImage: {
              accept: ['image/*'],
              maxSize: 1000000,
              type: 'blob',
            },
            description: {
              maxGraphemes: 3000,
              maxLength: 30000,
              type: 'string',
            },
            path: {
              description:
                'combine with the publication url or the document site to construct a full url to the document',
              type: 'string',
            },
            publishedAt: {
              format: 'datetime',
              type: 'string',
            },
            site: {
              description:
                'URI to the site or publication this document belongs to. Supports both AT-URIs (at://did/collection/rkey) for publication references and HTTPS URLs (https://example.com) for standalone documents or external sites.',
              format: 'uri',
              type: 'string',
            },
            tags: {
              items: {
                maxGraphemes: 50,
                maxLength: 100,
                type: 'string',
              },
              type: 'array',
            },
            textContent: {
              type: 'string',
            },
            theme: {
              description:
                'Theme for standalone documents. For documents in publications, theme is inherited from the publication.',
              ref: 'lex:pub.leaflet.publication#theme',
              type: 'ref',
            },
            title: {
              maxGraphemes: 500,
              maxLength: 5000,
              type: 'string',
            },
            preferences: {
              type: 'union',
              refs: ['lex:pub.leaflet.publication#preferences'],
              closed: false,
            },
            updatedAt: {
              format: 'datetime',
              type: 'string',
            },
          },
          required: ['site', 'title', 'publishedAt'],
          type: 'object',
        },
        type: 'record',
      },
    },
    id: 'site.standard.document',
    lexicon: 1,
  },
  SiteStandardGraphSubscription: {
    defs: {
      main: {
        description: 'Record declaring a subscription to a publication',
        key: 'tid',
        record: {
          properties: {
            publication: {
              format: 'at-uri',
              type: 'string',
            },
          },
          required: ['publication'],
          type: 'object',
        },
        type: 'record',
      },
    },
    id: 'site.standard.graph.subscription',
    lexicon: 1,
  },
  SiteStandardPublication: {
    defs: {
      main: {
        key: 'tid',
        record: {
          properties: {
            basicTheme: {
              ref: 'lex:site.standard.theme.basic',
              type: 'ref',
            },
            theme: {
              type: 'union',
              refs: ['lex:pub.leaflet.publication#theme'],
            },
            description: {
              maxGraphemes: 300,
              maxLength: 3000,
              type: 'string',
            },
            icon: {
              accept: ['image/*'],
              maxSize: 1000000,
              type: 'blob',
            },
            name: {
              maxGraphemes: 128,
              maxLength: 1280,
              type: 'string',
            },
            preferences: {
              ref: 'lex:site.standard.publication#preferences',
              type: 'ref',
            },
            url: {
              format: 'uri',
              type: 'string',
            },
          },
          required: ['url', 'name'],
          type: 'object',
        },
        type: 'record',
      },
      preferences: {
        properties: {
          showInDiscover: {
            default: true,
            type: 'boolean',
          },
          showComments: {
            default: true,
            type: 'boolean',
          },
          showMentions: {
            default: true,
            type: 'boolean',
          },
          showPrevNext: {
            default: false,
            type: 'boolean',
          },
          showRecommends: {
            default: true,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    },
    id: 'site.standard.publication',
    lexicon: 1,
  },
  SiteStandardThemeBasic: {
    defs: {
      main: {
        properties: {
          accent: {
            refs: ['lex:site.standard.theme.color#rgb'],
            type: 'union',
          },
          accentForeground: {
            refs: ['lex:site.standard.theme.color#rgb'],
            type: 'union',
          },
          background: {
            refs: ['lex:site.standard.theme.color#rgb'],
            type: 'union',
          },
          foreground: {
            refs: ['lex:site.standard.theme.color#rgb'],
            type: 'union',
          },
        },
        required: ['background', 'foreground', 'accent', 'accentForeground'],
        type: 'object',
      },
    },
    id: 'site.standard.theme.basic',
    lexicon: 1,
  },
  SiteStandardThemeColor: {
    lexicon: 1,
    id: 'site.standard.theme.color',
    defs: {
      rgb: {
        type: 'object',
        required: ['r', 'g', 'b'],
        properties: {
          r: {
            type: 'integer',
            minimum: 0,
            maximum: 255,
          },
          g: {
            type: 'integer',
            minimum: 0,
            maximum: 255,
          },
          b: {
            type: 'integer',
            minimum: 0,
            maximum: 255,
          },
        },
      },
      rgba: {
        type: 'object',
        required: ['r', 'g', 'b', 'a'],
        properties: {
          r: {
            type: 'integer',
            minimum: 0,
            maximum: 255,
          },
          g: {
            type: 'integer',
            minimum: 0,
            maximum: 255,
          },
          b: {
            type: 'integer',
            minimum: 0,
            maximum: 255,
          },
          a: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  AppBskyActorProfile: 'app.bsky.actor.profile',
  ComAtprotoLabelDefs: 'com.atproto.label.defs',
  ComAtprotoRepoApplyWrites: 'com.atproto.repo.applyWrites',
  ComAtprotoRepoCreateRecord: 'com.atproto.repo.createRecord',
  ComAtprotoRepoDefs: 'com.atproto.repo.defs',
  ComAtprotoRepoDeleteRecord: 'com.atproto.repo.deleteRecord',
  ComAtprotoRepoDescribeRepo: 'com.atproto.repo.describeRepo',
  ComAtprotoRepoGetRecord: 'com.atproto.repo.getRecord',
  ComAtprotoRepoImportRepo: 'com.atproto.repo.importRepo',
  ComAtprotoRepoListMissingBlobs: 'com.atproto.repo.listMissingBlobs',
  ComAtprotoRepoListRecords: 'com.atproto.repo.listRecords',
  ComAtprotoRepoPutRecord: 'com.atproto.repo.putRecord',
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  ComAtprotoRepoUploadBlob: 'com.atproto.repo.uploadBlob',
  PubLeafletBlocksBlockquote: 'pub.leaflet.blocks.blockquote',
  PubLeafletBlocksBskyPost: 'pub.leaflet.blocks.bskyPost',
  PubLeafletBlocksButton: 'pub.leaflet.blocks.button',
  PubLeafletBlocksCode: 'pub.leaflet.blocks.code',
  PubLeafletBlocksHeader: 'pub.leaflet.blocks.header',
  PubLeafletBlocksHorizontalRule: 'pub.leaflet.blocks.horizontalRule',
  PubLeafletBlocksIframe: 'pub.leaflet.blocks.iframe',
  PubLeafletBlocksImage: 'pub.leaflet.blocks.image',
  PubLeafletBlocksMath: 'pub.leaflet.blocks.math',
  PubLeafletBlocksOrderedList: 'pub.leaflet.blocks.orderedList',
  PubLeafletBlocksPage: 'pub.leaflet.blocks.page',
  PubLeafletBlocksPoll: 'pub.leaflet.blocks.poll',
  PubLeafletBlocksText: 'pub.leaflet.blocks.text',
  PubLeafletBlocksUnorderedList: 'pub.leaflet.blocks.unorderedList',
  PubLeafletBlocksWebsite: 'pub.leaflet.blocks.website',
  PubLeafletComment: 'pub.leaflet.comment',
  PubLeafletContent: 'pub.leaflet.content',
  PubLeafletDocument: 'pub.leaflet.document',
  PubLeafletGraphSubscription: 'pub.leaflet.graph.subscription',
  PubLeafletInteractionsRecommend: 'pub.leaflet.interactions.recommend',
  PubLeafletPagesCanvas: 'pub.leaflet.pages.canvas',
  PubLeafletPagesLinearDocument: 'pub.leaflet.pages.linearDocument',
  PubLeafletPollDefinition: 'pub.leaflet.poll.definition',
  PubLeafletPollVote: 'pub.leaflet.poll.vote',
  PubLeafletPublication: 'pub.leaflet.publication',
  PubLeafletRichtextFacet: 'pub.leaflet.richtext.facet',
  PubLeafletThemeBackgroundImage: 'pub.leaflet.theme.backgroundImage',
  PubLeafletThemeColor: 'pub.leaflet.theme.color',
  SiteStandardDocument: 'site.standard.document',
  SiteStandardGraphSubscription: 'site.standard.graph.subscription',
  SiteStandardPublication: 'site.standard.publication',
  SiteStandardThemeBasic: 'site.standard.theme.basic',
  SiteStandardThemeColor: 'site.standard.theme.color',
} as const
