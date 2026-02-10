-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.atp_poll_records (
  uri text NOT NULL,
  cid text NOT NULL,
  record jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT atp_poll_records_pkey PRIMARY KEY (uri)
);
CREATE TABLE public.atp_poll_votes (
  uri text NOT NULL,
  record jsonb NOT NULL,
  voter_did text NOT NULL,
  poll_uri text NOT NULL,
  poll_cid text NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT atp_poll_votes_pkey PRIMARY KEY (uri),
  CONSTRAINT atp_poll_votes_poll_uri_fkey FOREIGN KEY (poll_uri) REFERENCES public.atp_poll_records(uri)
);
CREATE TABLE public.bsky_follows (
  identity text NOT NULL DEFAULT ''::text,
  follows text NOT NULL,
  CONSTRAINT bsky_follows_pkey PRIMARY KEY (identity, follows),
  CONSTRAINT bsky_follows_follows_fkey FOREIGN KEY (follows) REFERENCES public.identities(atp_did),
  CONSTRAINT bsky_follows_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.bsky_posts (
  uri text NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  post_view jsonb NOT NULL,
  cid text NOT NULL,
  CONSTRAINT bsky_posts_pkey PRIMARY KEY (uri)
);
CREATE TABLE public.bsky_profiles (
  did text NOT NULL,
  record jsonb NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  handle text,
  CONSTRAINT bsky_profiles_pkey PRIMARY KEY (did),
  CONSTRAINT bsky_profiles_did_fkey FOREIGN KEY (did) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.comments_on_documents (
  uri text NOT NULL,
  record jsonb NOT NULL,
  document text,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  profile text,
  CONSTRAINT comments_on_documents_pkey PRIMARY KEY (uri),
  CONSTRAINT comments_on_documents_document_fkey FOREIGN KEY (document) REFERENCES public.documents(uri),
  CONSTRAINT comments_on_documents_profile_fkey FOREIGN KEY (profile) REFERENCES public.bsky_profiles(did)
);
CREATE TABLE public.custom_domain_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  route text NOT NULL,
  edit_permission_token uuid NOT NULL,
  view_permission_token uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_domain_routes_pkey PRIMARY KEY (id),
  CONSTRAINT custom_domain_routes_edit_permission_token_fkey FOREIGN KEY (edit_permission_token) REFERENCES public.permission_tokens(id),
  CONSTRAINT custom_domain_routes_view_permission_token_fkey FOREIGN KEY (view_permission_token) REFERENCES public.permission_tokens(id),
  CONSTRAINT custom_domain_routes_domain_fkey FOREIGN KEY (domain) REFERENCES public.custom_domains(domain)
);
CREATE TABLE public.custom_domains (
  domain text NOT NULL,
  identity text DEFAULT ''::text,
  confirmed boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  identity_id uuid,
  CONSTRAINT custom_domains_pkey PRIMARY KEY (domain),
  CONSTRAINT custom_domains_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES public.identities(id),
  CONSTRAINT custom_domains_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(email)
);
CREATE TABLE public.document_mentions_in_bsky (
  uri text NOT NULL,
  link text NOT NULL,
  document text NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_mentions_in_bsky_pkey PRIMARY KEY (uri, document),
  CONSTRAINT document_mentions_in_bsky_document_fkey FOREIGN KEY (document) REFERENCES public.documents(uri),
  CONSTRAINT document_mentions_in_bsky_uri_fkey FOREIGN KEY (uri) REFERENCES public.bsky_posts(uri)
);
CREATE TABLE public.documents (
  uri text NOT NULL,
  data jsonb NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  sort_date timestamp with time zone DEFAULT LEAST(COALESCE(parse_iso_timestamp((data ->> 'publishedAt'::text)), indexed_at), indexed_at),
  bsky_like_count integer NOT NULL DEFAULT 0,
  CONSTRAINT documents_pkey PRIMARY KEY (uri)
);
CREATE TABLE public.documents_in_publications (
  publication text NOT NULL,
  document text NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_in_publications_pkey PRIMARY KEY (publication, document),
  CONSTRAINT documents_in_publications_document_fkey FOREIGN KEY (document) REFERENCES public.documents(uri),
  CONSTRAINT documents_in_publications_publication_fkey FOREIGN KEY (publication) REFERENCES public.publications(uri)
);
CREATE TABLE public.email_auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed boolean NOT NULL DEFAULT false,
  email text,
  confirmation_code text NOT NULL,
  identity uuid,
  CONSTRAINT email_auth_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_auth_tokens_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(id)
);
CREATE TABLE public.email_subscriptions_to_entity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  token uuid NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  confirmation_code text NOT NULL,
  CONSTRAINT email_subscriptions_to_entity_pkey PRIMARY KEY (id),
  CONSTRAINT email_subscriptions_to_entity_entity_fkey FOREIGN KEY (entity) REFERENCES public.entities(id),
  CONSTRAINT email_subscriptions_to_entity_token_fkey FOREIGN KEY (token) REFERENCES public.permission_tokens(id)
);
CREATE TABLE public.entities (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  set uuid NOT NULL,
  CONSTRAINT entities_pkey PRIMARY KEY (id),
  CONSTRAINT entities_set_fkey FOREIGN KEY (set) REFERENCES public.entity_sets(id)
);
CREATE TABLE public.entity_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entity_sets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facts (
  id uuid NOT NULL,
  entity uuid NOT NULL,
  attribute text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  version bigint NOT NULL DEFAULT '0'::bigint,
  CONSTRAINT facts_pkey PRIMARY KEY (id),
  CONSTRAINT facts_entity_fkey FOREIGN KEY (entity) REFERENCES public.entities(id)
);
CREATE TABLE public.identities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  home_page uuid NOT NULL DEFAULT create_identity_homepage(),
  email text UNIQUE,
  atp_did text UNIQUE,
  interface_state jsonb,
  metadata jsonb,
  CONSTRAINT identities_pkey PRIMARY KEY (id),
  CONSTRAINT identities_home_page_fkey FOREIGN KEY (home_page) REFERENCES public.permission_tokens(id)
);
CREATE TABLE public.leaflets_in_publications (
  publication text NOT NULL,
  doc text DEFAULT ''::text,
  leaflet uuid NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  title text NOT NULL DEFAULT ''::text,
  archived boolean,
  tags ARRAY DEFAULT ARRAY[]::text[],
  cover_image text,
  preferences jsonb,
  CONSTRAINT leaflets_in_publications_pkey PRIMARY KEY (publication, leaflet),
  CONSTRAINT leaflets_in_publications_publication_fkey FOREIGN KEY (publication) REFERENCES public.publications(uri),
  CONSTRAINT leaflets_in_publications_leaflet_fkey FOREIGN KEY (leaflet) REFERENCES public.permission_tokens(id),
  CONSTRAINT leaflets_in_publications_doc_fkey FOREIGN KEY (doc) REFERENCES public.documents(uri)
);
CREATE TABLE public.leaflets_to_documents (
  leaflet uuid NOT NULL,
  document text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  tags ARRAY DEFAULT ARRAY[]::text[],
  cover_image text,
  preferences jsonb,
  CONSTRAINT leaflets_to_documents_pkey PRIMARY KEY (leaflet, document),
  CONSTRAINT leaflets_to_documents_document_fkey FOREIGN KEY (document) REFERENCES public.documents(uri),
  CONSTRAINT leaflets_to_documents_leaflet_fkey FOREIGN KEY (leaflet) REFERENCES public.permission_tokens(id)
);
CREATE TABLE public.notifications (
  recipient text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL,
  id uuid NOT NULL,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_fkey FOREIGN KEY (recipient) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.oauth_session_store (
  key text NOT NULL,
  session jsonb NOT NULL,
  CONSTRAINT oauth_session_store_pkey PRIMARY KEY (key)
);
CREATE TABLE public.oauth_state_store (
  key text NOT NULL,
  state jsonb NOT NULL,
  CONSTRAINT oauth_state_store_pkey PRIMARY KEY (key)
);
CREATE TABLE public.permission_token_on_homepage (
  token uuid NOT NULL,
  identity uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived boolean,
  CONSTRAINT permission_token_on_homepage_pkey PRIMARY KEY (token, identity),
  CONSTRAINT permission_token_creator_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(id),
  CONSTRAINT permission_token_on_homepage_token_fkey FOREIGN KEY (token) REFERENCES public.permission_tokens(id)
);
CREATE TABLE public.permission_token_rights (
  token uuid NOT NULL,
  entity_set uuid NOT NULL,
  read boolean NOT NULL DEFAULT false,
  write boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  create_token boolean NOT NULL DEFAULT false,
  change_entity_set boolean NOT NULL DEFAULT false,
  CONSTRAINT permission_token_rights_pkey PRIMARY KEY (token, entity_set),
  CONSTRAINT permission_token_rights_entity_set_fkey FOREIGN KEY (entity_set) REFERENCES public.entity_sets(id),
  CONSTRAINT permission_token_rights_token_fkey FOREIGN KEY (token) REFERENCES public.permission_tokens(id)
);
CREATE TABLE public.permission_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  root_entity uuid NOT NULL,
  blocked_by_admin boolean,
  CONSTRAINT permission_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT permission_tokens_root_entity_fkey FOREIGN KEY (root_entity) REFERENCES public.entities(id)
);
CREATE TABLE public.phone_number_auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed boolean NOT NULL DEFAULT false,
  confirmation_code text NOT NULL,
  phone_number text NOT NULL,
  country_code text NOT NULL,
  CONSTRAINT phone_number_auth_tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.phone_rsvps_to_entity (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  phone_number text NOT NULL,
  country_code text NOT NULL,
  status USER-DEFINED NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  plus_ones smallint NOT NULL DEFAULT '0'::smallint,
  CONSTRAINT phone_rsvps_to_entity_pkey PRIMARY KEY (id),
  CONSTRAINT phone_rsvps_to_entity_entity_fkey FOREIGN KEY (entity) REFERENCES public.entities(id)
);
CREATE TABLE public.poll_votes_on_entity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  poll_entity uuid NOT NULL,
  option_entity uuid NOT NULL,
  voter_token uuid NOT NULL,
  CONSTRAINT poll_votes_on_entity_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_on_entity_option_entity_fkey FOREIGN KEY (option_entity) REFERENCES public.entities(id),
  CONSTRAINT poll_votes_on_entity_poll_entity_fkey FOREIGN KEY (poll_entity) REFERENCES public.entities(id)
);
CREATE TABLE public.publication_domains (
  publication text NOT NULL,
  domain text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  identity text NOT NULL,
  CONSTRAINT publication_domains_pkey PRIMARY KEY (publication, domain),
  CONSTRAINT publication_domains_domain_fkey FOREIGN KEY (domain) REFERENCES public.custom_domains(domain),
  CONSTRAINT publication_domains_publication_fkey FOREIGN KEY (publication) REFERENCES public.publications(uri),
  CONSTRAINT publication_domains_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.publication_subscriptions (
  publication text NOT NULL,
  identity text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  record jsonb NOT NULL,
  uri text NOT NULL UNIQUE,
  CONSTRAINT publication_subscriptions_pkey PRIMARY KEY (publication, identity),
  CONSTRAINT publication_subscriptions_publication_fkey FOREIGN KEY (publication) REFERENCES public.publications(uri),
  CONSTRAINT publication_subscriptions_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.publications (
  uri text NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  identity_did text NOT NULL,
  record jsonb,
  CONSTRAINT publications_pkey PRIMARY KEY (uri),
  CONSTRAINT publications_identity_did_fkey FOREIGN KEY (identity_did) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.recommends_on_documents (
  uri text NOT NULL,
  record jsonb NOT NULL,
  document text NOT NULL,
  recommender_did text NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recommends_on_documents_pkey PRIMARY KEY (uri),
  CONSTRAINT recommends_on_documents_document_fkey FOREIGN KEY (document) REFERENCES public.documents(uri),
  CONSTRAINT recommends_on_documents_recommender_did_fkey FOREIGN KEY (recommender_did) REFERENCES public.identities(atp_did)
);
CREATE TABLE public.replicache_clients (
  client_id text NOT NULL,
  client_group text NOT NULL,
  last_mutation bigint NOT NULL,
  CONSTRAINT replicache_clients_pkey PRIMARY KEY (client_id)
);
CREATE TABLE public.subscribers_to_publications (
  identity text NOT NULL,
  publication text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscribers_to_publications_pkey PRIMARY KEY (identity, publication),
  CONSTRAINT subscribers_to_publications_identity_fkey FOREIGN KEY (identity) REFERENCES public.identities(email),
  CONSTRAINT subscribers_to_publications_publication_fkey FOREIGN KEY (publication) REFERENCES public.publications(uri)
);
