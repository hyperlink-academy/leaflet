export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      atp_poll_records: {
        Row: {
          cid: string
          created_at: string
          record: Json
          uri: string
        }
        Insert: {
          cid: string
          created_at?: string
          record: Json
          uri: string
        }
        Update: {
          cid?: string
          created_at?: string
          record?: Json
          uri?: string
        }
        Relationships: []
      }
      atp_poll_votes: {
        Row: {
          indexed_at: string
          poll_cid: string
          poll_uri: string
          record: Json
          uri: string
          voter_did: string
        }
        Insert: {
          indexed_at?: string
          poll_cid: string
          poll_uri: string
          record: Json
          uri: string
          voter_did: string
        }
        Update: {
          indexed_at?: string
          poll_cid?: string
          poll_uri?: string
          record?: Json
          uri?: string
          voter_did?: string
        }
        Relationships: [
          {
            foreignKeyName: "atp_poll_votes_poll_uri_fkey"
            columns: ["poll_uri"]
            isOneToOne: false
            referencedRelation: "atp_poll_records"
            referencedColumns: ["uri"]
          },
        ]
      }
      bsky_follows: {
        Row: {
          follows: string
          identity: string
        }
        Insert: {
          follows: string
          identity?: string
        }
        Update: {
          follows?: string
          identity?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsky_follows_follows_fkey"
            columns: ["follows"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
          {
            foreignKeyName: "bsky_follows_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      bsky_posts: {
        Row: {
          cid: string
          indexed_at: string
          post_view: Json
          uri: string
        }
        Insert: {
          cid: string
          indexed_at?: string
          post_view: Json
          uri: string
        }
        Update: {
          cid?: string
          indexed_at?: string
          post_view?: Json
          uri?: string
        }
        Relationships: []
      }
      bsky_profiles: {
        Row: {
          did: string
          handle: string | null
          indexed_at: string
          record: Json
        }
        Insert: {
          did: string
          handle?: string | null
          indexed_at?: string
          record: Json
        }
        Update: {
          did?: string
          handle?: string | null
          indexed_at?: string
          record?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bsky_profiles_did_fkey"
            columns: ["did"]
            isOneToOne: true
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      comments_on_documents: {
        Row: {
          document: string | null
          indexed_at: string
          profile: string | null
          record: Json
          uri: string
        }
        Insert: {
          document?: string | null
          indexed_at?: string
          profile?: string | null
          record: Json
          uri: string
        }
        Update: {
          document?: string | null
          indexed_at?: string
          profile?: string | null
          record?: Json
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_on_documents_document_fkey"
            columns: ["document"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "comments_on_documents_profile_fkey"
            columns: ["profile"]
            isOneToOne: false
            referencedRelation: "bsky_profiles"
            referencedColumns: ["did"]
          },
        ]
      }
      custom_domain_routes: {
        Row: {
          created_at: string
          domain: string
          edit_permission_token: string
          id: string
          route: string
          view_permission_token: string
        }
        Insert: {
          created_at?: string
          domain: string
          edit_permission_token: string
          id?: string
          route: string
          view_permission_token: string
        }
        Update: {
          created_at?: string
          domain?: string
          edit_permission_token?: string
          id?: string
          route?: string
          view_permission_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_domain_routes_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "custom_domains"
            referencedColumns: ["domain"]
          },
          {
            foreignKeyName: "custom_domain_routes_edit_permission_token_fkey"
            columns: ["edit_permission_token"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_domain_routes_view_permission_token_fkey"
            columns: ["view_permission_token"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          confirmed: boolean
          created_at: string
          domain: string
          identity: string | null
          identity_id: string | null
        }
        Insert: {
          confirmed: boolean
          created_at?: string
          domain: string
          identity?: string | null
          identity_id?: string | null
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          domain?: string
          identity?: string | null
          identity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "custom_domains_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      document_mentions_in_bsky: {
        Row: {
          document: string
          indexed_at: string
          link: string
          uri: string
        }
        Insert: {
          document: string
          indexed_at?: string
          link: string
          uri: string
        }
        Update: {
          document?: string
          indexed_at?: string
          link?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_mentions_in_bsky_document_fkey"
            columns: ["document"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "document_mentions_in_bsky_uri_fkey"
            columns: ["uri"]
            isOneToOne: false
            referencedRelation: "bsky_posts"
            referencedColumns: ["uri"]
          },
        ]
      }
      documents: {
        Row: {
          bsky_like_count: number
          data: Json
          indexed: boolean
          indexed_at: string
          recommend_count: number
          sort_date: string
          uri: string
        }
        Insert: {
          bsky_like_count?: number
          data: Json
          indexed?: boolean
          indexed_at?: string
          recommend_count?: number
          sort_date?: string
          uri: string
        }
        Update: {
          bsky_like_count?: number
          data?: Json
          indexed?: boolean
          indexed_at?: string
          recommend_count?: number
          sort_date?: string
          uri?: string
        }
        Relationships: []
      }
      documents_in_publications: {
        Row: {
          document: string
          indexed_at: string
          publication: string
        }
        Insert: {
          document: string
          indexed_at?: string
          publication: string
        }
        Update: {
          document?: string
          indexed_at?: string
          publication?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_in_publications_document_fkey"
            columns: ["document"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "documents_in_publications_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["uri"]
          },
        ]
      }
      email_auth_tokens: {
        Row: {
          confirmation_code: string
          confirmed: boolean
          created_at: string
          email: string | null
          id: string
          identity: string | null
        }
        Insert: {
          confirmation_code: string
          confirmed?: boolean
          created_at?: string
          email?: string | null
          id?: string
          identity?: string | null
        }
        Update: {
          confirmation_code?: string
          confirmed?: boolean
          created_at?: string
          email?: string | null
          id?: string
          identity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_auth_tokens_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscriptions_to_entity: {
        Row: {
          confirmation_code: string
          confirmed: boolean
          created_at: string
          email: string
          entity: string
          id: string
          token: string
        }
        Insert: {
          confirmation_code: string
          confirmed?: boolean
          created_at?: string
          email: string
          entity: string
          id?: string
          token: string
        }
        Update: {
          confirmation_code?: string
          confirmed?: boolean
          created_at?: string
          email?: string
          entity?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_subscriptions_to_entity_entity_fkey"
            columns: ["entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_subscriptions_to_entity_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          created_at: string
          id: string
          set: string
        }
        Insert: {
          created_at?: string
          id: string
          set: string
        }
        Update: {
          created_at?: string
          id?: string
          set?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_set_fkey"
            columns: ["set"]
            isOneToOne: false
            referencedRelation: "entity_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_sets: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      facts: {
        Row: {
          attribute: string
          created_at: string
          data: Json
          entity: string
          id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          attribute: string
          created_at?: string
          data: Json
          entity: string
          id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          attribute?: string
          created_at?: string
          data?: Json
          entity?: string
          id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "facts_entity_fkey"
            columns: ["entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      identities: {
        Row: {
          atp_did: string | null
          created_at: string
          email: string | null
          home_page: string
          id: string
          interface_state: Json | null
          metadata: Json | null
        }
        Insert: {
          atp_did?: string | null
          created_at?: string
          email?: string | null
          home_page?: string
          id?: string
          interface_state?: Json | null
          metadata?: Json | null
        }
        Update: {
          atp_did?: string | null
          created_at?: string
          email?: string | null
          home_page?: string
          id?: string
          interface_state?: Json | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "identities_home_page_fkey"
            columns: ["home_page"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      leaflets_in_publications: {
        Row: {
          archived: boolean | null
          cover_image: string | null
          description: string
          doc: string | null
          leaflet: string
          preferences: Json | null
          publication: string
          tags: string[] | null
          title: string
        }
        Insert: {
          archived?: boolean | null
          cover_image?: string | null
          description?: string
          doc?: string | null
          leaflet: string
          preferences?: Json | null
          publication: string
          tags?: string[] | null
          title?: string
        }
        Update: {
          archived?: boolean | null
          cover_image?: string | null
          description?: string
          doc?: string | null
          leaflet?: string
          preferences?: Json | null
          publication?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaflets_in_publications_doc_fkey"
            columns: ["doc"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "leaflets_in_publications_leaflet_fkey"
            columns: ["leaflet"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaflets_in_publications_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["uri"]
          },
        ]
      }
      leaflets_to_documents: {
        Row: {
          archived: boolean | null
          cover_image: string | null
          created_at: string
          description: string
          document: string
          leaflet: string
          preferences: Json | null
          tags: string[] | null
          title: string
        }
        Insert: {
          archived?: boolean | null
          cover_image?: string | null
          created_at?: string
          description?: string
          document: string
          leaflet: string
          preferences?: Json | null
          tags?: string[] | null
          title?: string
        }
        Update: {
          archived?: boolean | null
          cover_image?: string | null
          created_at?: string
          description?: string
          document?: string
          leaflet?: string
          preferences?: Json | null
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaflets_to_documents_document_fkey"
            columns: ["document"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "leaflets_to_documents_leaflet_fkey"
            columns: ["leaflet"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          read: boolean
          recipient: string
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          read?: boolean
          recipient: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          recipient?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_fkey"
            columns: ["recipient"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      oauth_session_store: {
        Row: {
          key: string
          session: Json
        }
        Insert: {
          key: string
          session: Json
        }
        Update: {
          key?: string
          session?: Json
        }
        Relationships: []
      }
      oauth_state_store: {
        Row: {
          key: string
          state: Json
        }
        Insert: {
          key: string
          state: Json
        }
        Update: {
          key?: string
          state?: Json
        }
        Relationships: []
      }
      permission_token_on_homepage: {
        Row: {
          archived: boolean | null
          created_at: string
          identity: string
          token: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          identity: string
          token: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          identity?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_token_creator_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_token_on_homepage_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_token_rights: {
        Row: {
          change_entity_set: boolean
          create_token: boolean
          created_at: string
          entity_set: string
          read: boolean
          token: string
          write: boolean
        }
        Insert: {
          change_entity_set?: boolean
          create_token?: boolean
          created_at?: string
          entity_set: string
          read?: boolean
          token: string
          write?: boolean
        }
        Update: {
          change_entity_set?: boolean
          create_token?: boolean
          created_at?: string
          entity_set?: string
          read?: boolean
          token?: string
          write?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permission_token_rights_entity_set_fkey"
            columns: ["entity_set"]
            isOneToOne: false
            referencedRelation: "entity_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_token_rights_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "permission_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_tokens: {
        Row: {
          blocked_by_admin: boolean | null
          id: string
          root_entity: string
        }
        Insert: {
          blocked_by_admin?: boolean | null
          id?: string
          root_entity: string
        }
        Update: {
          blocked_by_admin?: boolean | null
          id?: string
          root_entity?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_tokens_root_entity_fkey"
            columns: ["root_entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_number_auth_tokens: {
        Row: {
          confirmation_code: string
          confirmed: boolean
          country_code: string
          created_at: string
          id: string
          phone_number: string
        }
        Insert: {
          confirmation_code: string
          confirmed?: boolean
          country_code: string
          created_at?: string
          id?: string
          phone_number: string
        }
        Update: {
          confirmation_code?: string
          confirmed?: boolean
          country_code?: string
          created_at?: string
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      phone_rsvps_to_entity: {
        Row: {
          country_code: string
          created_at: string
          entity: string
          id: string
          name: string
          phone_number: string
          plus_ones: number
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          country_code: string
          created_at?: string
          entity: string
          id?: string
          name?: string
          phone_number: string
          plus_ones?: number
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          country_code?: string
          created_at?: string
          entity?: string
          id?: string
          name?: string
          phone_number?: string
          plus_ones?: number
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "phone_rsvps_to_entity_entity_fkey"
            columns: ["entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes_on_entity: {
        Row: {
          created_at: string
          id: string
          option_entity: string
          poll_entity: string
          voter_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_entity: string
          poll_entity: string
          voter_token: string
        }
        Update: {
          created_at?: string
          id?: string
          option_entity?: string
          poll_entity?: string
          voter_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_on_entity_option_entity_fkey"
            columns: ["option_entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_on_entity_poll_entity_fkey"
            columns: ["poll_entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_domains: {
        Row: {
          created_at: string
          domain: string
          identity: string
          publication: string
        }
        Insert: {
          created_at?: string
          domain: string
          identity: string
          publication: string
        }
        Update: {
          created_at?: string
          domain?: string
          identity?: string
          publication?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_domains_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "custom_domains"
            referencedColumns: ["domain"]
          },
          {
            foreignKeyName: "publication_domains_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
          {
            foreignKeyName: "publication_domains_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["uri"]
          },
        ]
      }
      publication_subscriptions: {
        Row: {
          created_at: string
          identity: string
          publication: string
          record: Json
          uri: string
        }
        Insert: {
          created_at?: string
          identity: string
          publication: string
          record: Json
          uri: string
        }
        Update: {
          created_at?: string
          identity?: string
          publication?: string
          record?: Json
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_subscriptions_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
          {
            foreignKeyName: "publication_subscriptions_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["uri"]
          },
        ]
      }
      publications: {
        Row: {
          identity_did: string
          indexed_at: string
          name: string
          record: Json | null
          uri: string
        }
        Insert: {
          identity_did: string
          indexed_at?: string
          name: string
          record?: Json | null
          uri: string
        }
        Update: {
          identity_did?: string
          indexed_at?: string
          name?: string
          record?: Json | null
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_identity_did_fkey"
            columns: ["identity_did"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      recommends_on_documents: {
        Row: {
          document: string
          indexed_at: string
          recommender_did: string
          record: Json
          uri: string
        }
        Insert: {
          document: string
          indexed_at?: string
          recommender_did: string
          record: Json
          uri: string
        }
        Update: {
          document?: string
          indexed_at?: string
          recommender_did?: string
          record?: Json
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommends_on_documents_document_fkey"
            columns: ["document"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "recommends_on_documents_recommender_did_fkey"
            columns: ["recommender_did"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      replicache_clients: {
        Row: {
          client_group: string
          client_id: string
          last_mutation: number
        }
        Insert: {
          client_group: string
          client_id: string
          last_mutation: number
        }
        Update: {
          client_group?: string
          client_id?: string
          last_mutation?: number
        }
        Relationships: []
      }
      site_standard_documents: {
        Row: {
          data: Json
          identity_did: string
          indexed_at: string
          uri: string
        }
        Insert: {
          data: Json
          identity_did: string
          indexed_at?: string
          uri: string
        }
        Update: {
          data?: Json
          identity_did?: string
          indexed_at?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_standard_documents_identity_did_fkey"
            columns: ["identity_did"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      site_standard_documents_in_publications: {
        Row: {
          document: string
          indexed_at: string
          publication: string
        }
        Insert: {
          document: string
          indexed_at?: string
          publication: string
        }
        Update: {
          document?: string
          indexed_at?: string
          publication?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_standard_documents_in_publications_document_fkey"
            columns: ["document"]
            isOneToOne: false
            referencedRelation: "site_standard_documents"
            referencedColumns: ["uri"]
          },
          {
            foreignKeyName: "site_standard_documents_in_publications_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "site_standard_publications"
            referencedColumns: ["uri"]
          },
        ]
      }
      site_standard_publications: {
        Row: {
          data: Json
          identity_did: string
          indexed_at: string
          uri: string
        }
        Insert: {
          data: Json
          identity_did: string
          indexed_at?: string
          uri: string
        }
        Update: {
          data?: Json
          identity_did?: string
          indexed_at?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_standard_publications_identity_did_fkey"
            columns: ["identity_did"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
        ]
      }
      site_standard_subscriptions: {
        Row: {
          created_at: string
          identity: string
          publication: string
          record: Json
          uri: string
        }
        Insert: {
          created_at?: string
          identity: string
          publication: string
          record: Json
          uri: string
        }
        Update: {
          created_at?: string
          identity?: string
          publication?: string
          record?: Json
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_standard_subscriptions_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["atp_did"]
          },
          {
            foreignKeyName: "site_standard_subscriptions_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "site_standard_publications"
            referencedColumns: ["uri"]
          },
        ]
      }
      subscribers_to_publications: {
        Row: {
          created_at: string
          identity: string
          publication: string
        }
        Insert: {
          created_at?: string
          identity: string
          publication: string
        }
        Update: {
          created_at?: string
          identity?: string
          publication?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_to_publications_identity_fkey"
            columns: ["identity"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "subscribers_to_publications_publication_fkey"
            columns: ["publication"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["uri"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_identity_homepage: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_facts: {
        Args: {
          root: string
        }
        Returns: {
          attribute: string
          created_at: string
          data: Json
          entity: string
          id: string
          updated_at: string | null
          version: number
        }[]
      }
      get_facts_for_roots: {
        Args: {
          roots: string[]
          max_depth: number
        }
        Returns: {
          root_id: string
          id: string
          entity: string
          attribute: string
          data: Json
          created_at: string
          updated_at: string
          version: number
        }[]
      }
      get_facts_with_depth: {
        Args: {
          root: string
          max_depth: number
        }
        Returns: {
          like: unknown
        }[]
      }
      parse_iso_timestamp: {
        Args: {
          "": string
        }
        Returns: string
      }
      pull_data: {
        Args: {
          token_id: string
          client_group_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["pull_result"]
      }
      search_tags: {
        Args: {
          search_query: string
        }
        Returns: {
          name: string
          document_count: number
        }[]
      }
    }
    Enums: {
      rsvp_status: "GOING" | "NOT_GOING" | "MAYBE"
    }
    CompositeTypes: {
      pull_result: {
        client_groups: Json | null
        facts: Json | null
        publications: Json | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

