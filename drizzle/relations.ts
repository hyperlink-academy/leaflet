import { relations } from "drizzle-orm/relations";
import { identities, bsky_profiles, publications, documents, comments_on_documents, entities, facts, entity_sets, permission_tokens, email_subscriptions_to_entity, email_auth_tokens, custom_domains, phone_rsvps_to_entity, custom_domain_routes, poll_votes_on_entity, subscribers_to_publications, document_mentions_in_bsky, bsky_posts, permission_token_on_homepage, documents_in_publications, publication_domains, publication_subscriptions, leaflets_in_publications, permission_token_rights } from "./schema";

export const bsky_profilesRelations = relations(bsky_profiles, ({one, many}) => ({
	identity: one(identities, {
		fields: [bsky_profiles.did],
		references: [identities.atp_did]
	}),
	comments_on_documents: many(comments_on_documents),
}));

export const identitiesRelations = relations(identities, ({one, many}) => ({
	bsky_profiles: many(bsky_profiles),
	publications: many(publications),
	permission_token: one(permission_tokens, {
		fields: [identities.home_page],
		references: [permission_tokens.id]
	}),
	email_auth_tokens: many(email_auth_tokens),
	custom_domains_identity: many(custom_domains, {
		relationName: "custom_domains_identity_identities_email"
	}),
	custom_domains_identity_id: many(custom_domains, {
		relationName: "custom_domains_identity_id_identities_id"
	}),
	subscribers_to_publications: many(subscribers_to_publications),
	permission_token_on_homepages: many(permission_token_on_homepage),
	publication_domains: many(publication_domains),
	publication_subscriptions: many(publication_subscriptions),
}));

export const publicationsRelations = relations(publications, ({one, many}) => ({
	identity: one(identities, {
		fields: [publications.identity_did],
		references: [identities.atp_did]
	}),
	subscribers_to_publications: many(subscribers_to_publications),
	documents_in_publications: many(documents_in_publications),
	publication_domains: many(publication_domains),
	publication_subscriptions: many(publication_subscriptions),
	leaflets_in_publications: many(leaflets_in_publications),
}));

export const comments_on_documentsRelations = relations(comments_on_documents, ({one}) => ({
	document: one(documents, {
		fields: [comments_on_documents.document],
		references: [documents.uri]
	}),
	bsky_profile: one(bsky_profiles, {
		fields: [comments_on_documents.profile],
		references: [bsky_profiles.did]
	}),
}));

export const documentsRelations = relations(documents, ({many}) => ({
	comments_on_documents: many(comments_on_documents),
	document_mentions_in_bskies: many(document_mentions_in_bsky),
	documents_in_publications: many(documents_in_publications),
	leaflets_in_publications: many(leaflets_in_publications),
}));

export const factsRelations = relations(facts, ({one}) => ({
	entity: one(entities, {
		fields: [facts.entity],
		references: [entities.id]
	}),
}));

export const entitiesRelations = relations(entities, ({one, many}) => ({
	facts: many(facts),
	entity_set: one(entity_sets, {
		fields: [entities.set],
		references: [entity_sets.id]
	}),
	permission_tokens: many(permission_tokens),
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	phone_rsvps_to_entities: many(phone_rsvps_to_entity),
	poll_votes_on_entities_option_entity: many(poll_votes_on_entity, {
		relationName: "poll_votes_on_entity_option_entity_entities_id"
	}),
	poll_votes_on_entities_poll_entity: many(poll_votes_on_entity, {
		relationName: "poll_votes_on_entity_poll_entity_entities_id"
	}),
}));

export const entity_setsRelations = relations(entity_sets, ({many}) => ({
	entities: many(entities),
	permission_token_rights: many(permission_token_rights),
}));

export const permission_tokensRelations = relations(permission_tokens, ({one, many}) => ({
	entity: one(entities, {
		fields: [permission_tokens.root_entity],
		references: [entities.id]
	}),
	identities: many(identities),
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	custom_domain_routes_edit_permission_token: many(custom_domain_routes, {
		relationName: "custom_domain_routes_edit_permission_token_permission_tokens_id"
	}),
	custom_domain_routes_view_permission_token: many(custom_domain_routes, {
		relationName: "custom_domain_routes_view_permission_token_permission_tokens_id"
	}),
	permission_token_on_homepages: many(permission_token_on_homepage),
	leaflets_in_publications: many(leaflets_in_publications),
	permission_token_rights: many(permission_token_rights),
}));

export const email_subscriptions_to_entityRelations = relations(email_subscriptions_to_entity, ({one}) => ({
	entity: one(entities, {
		fields: [email_subscriptions_to_entity.entity],
		references: [entities.id]
	}),
	permission_token: one(permission_tokens, {
		fields: [email_subscriptions_to_entity.token],
		references: [permission_tokens.id]
	}),
}));

export const email_auth_tokensRelations = relations(email_auth_tokens, ({one}) => ({
	identity: one(identities, {
		fields: [email_auth_tokens.identity],
		references: [identities.id]
	}),
}));

export const custom_domainsRelations = relations(custom_domains, ({one, many}) => ({
	identity_identity: one(identities, {
		fields: [custom_domains.identity],
		references: [identities.email],
		relationName: "custom_domains_identity_identities_email"
	}),
	identity_identity_id: one(identities, {
		fields: [custom_domains.identity_id],
		references: [identities.id],
		relationName: "custom_domains_identity_id_identities_id"
	}),
	custom_domain_routes: many(custom_domain_routes),
	publication_domains: many(publication_domains),
}));

export const phone_rsvps_to_entityRelations = relations(phone_rsvps_to_entity, ({one}) => ({
	entity: one(entities, {
		fields: [phone_rsvps_to_entity.entity],
		references: [entities.id]
	}),
}));

export const custom_domain_routesRelations = relations(custom_domain_routes, ({one}) => ({
	custom_domain: one(custom_domains, {
		fields: [custom_domain_routes.domain],
		references: [custom_domains.domain]
	}),
	permission_token_edit_permission_token: one(permission_tokens, {
		fields: [custom_domain_routes.edit_permission_token],
		references: [permission_tokens.id],
		relationName: "custom_domain_routes_edit_permission_token_permission_tokens_id"
	}),
	permission_token_view_permission_token: one(permission_tokens, {
		fields: [custom_domain_routes.view_permission_token],
		references: [permission_tokens.id],
		relationName: "custom_domain_routes_view_permission_token_permission_tokens_id"
	}),
}));

export const poll_votes_on_entityRelations = relations(poll_votes_on_entity, ({one}) => ({
	entity_option_entity: one(entities, {
		fields: [poll_votes_on_entity.option_entity],
		references: [entities.id],
		relationName: "poll_votes_on_entity_option_entity_entities_id"
	}),
	entity_poll_entity: one(entities, {
		fields: [poll_votes_on_entity.poll_entity],
		references: [entities.id],
		relationName: "poll_votes_on_entity_poll_entity_entities_id"
	}),
}));

export const subscribers_to_publicationsRelations = relations(subscribers_to_publications, ({one}) => ({
	identity: one(identities, {
		fields: [subscribers_to_publications.identity],
		references: [identities.email]
	}),
	publication: one(publications, {
		fields: [subscribers_to_publications.publication],
		references: [publications.uri]
	}),
}));

export const document_mentions_in_bskyRelations = relations(document_mentions_in_bsky, ({one}) => ({
	document: one(documents, {
		fields: [document_mentions_in_bsky.document],
		references: [documents.uri]
	}),
	bsky_post: one(bsky_posts, {
		fields: [document_mentions_in_bsky.uri],
		references: [bsky_posts.uri]
	}),
}));

export const bsky_postsRelations = relations(bsky_posts, ({many}) => ({
	document_mentions_in_bskies: many(document_mentions_in_bsky),
}));

export const permission_token_on_homepageRelations = relations(permission_token_on_homepage, ({one}) => ({
	identity: one(identities, {
		fields: [permission_token_on_homepage.identity],
		references: [identities.id]
	}),
	permission_token: one(permission_tokens, {
		fields: [permission_token_on_homepage.token],
		references: [permission_tokens.id]
	}),
}));

export const documents_in_publicationsRelations = relations(documents_in_publications, ({one}) => ({
	document: one(documents, {
		fields: [documents_in_publications.document],
		references: [documents.uri]
	}),
	publication: one(publications, {
		fields: [documents_in_publications.publication],
		references: [publications.uri]
	}),
}));

export const publication_domainsRelations = relations(publication_domains, ({one}) => ({
	custom_domain: one(custom_domains, {
		fields: [publication_domains.domain],
		references: [custom_domains.domain]
	}),
	identity: one(identities, {
		fields: [publication_domains.identity],
		references: [identities.atp_did]
	}),
	publication: one(publications, {
		fields: [publication_domains.publication],
		references: [publications.uri]
	}),
}));

export const publication_subscriptionsRelations = relations(publication_subscriptions, ({one}) => ({
	identity: one(identities, {
		fields: [publication_subscriptions.identity],
		references: [identities.atp_did]
	}),
	publication: one(publications, {
		fields: [publication_subscriptions.publication],
		references: [publications.uri]
	}),
}));

export const leaflets_in_publicationsRelations = relations(leaflets_in_publications, ({one}) => ({
	document: one(documents, {
		fields: [leaflets_in_publications.doc],
		references: [documents.uri]
	}),
	permission_token: one(permission_tokens, {
		fields: [leaflets_in_publications.leaflet],
		references: [permission_tokens.id]
	}),
	publication: one(publications, {
		fields: [leaflets_in_publications.publication],
		references: [publications.uri]
	}),
}));

export const permission_token_rightsRelations = relations(permission_token_rights, ({one}) => ({
	entity_set: one(entity_sets, {
		fields: [permission_token_rights.entity_set],
		references: [entity_sets.id]
	}),
	permission_token: one(permission_tokens, {
		fields: [permission_token_rights.token],
		references: [permission_tokens.id]
	}),
}));