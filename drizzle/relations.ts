import { relations } from "drizzle-orm/relations";
import { identities, notifications, publications, documents, comments_on_documents, bsky_profiles, entity_sets, entities, facts, email_auth_tokens, poll_votes_on_entity, permission_tokens, phone_rsvps_to_entity, site_standard_publications, custom_domains, custom_domain_routes, site_standard_documents, email_subscriptions_to_entity, atp_poll_records, atp_poll_votes, bsky_follows, subscribers_to_publications, site_standard_documents_in_publications, documents_in_publications, document_mentions_in_bsky, bsky_posts, permission_token_on_homepage, publication_domains, publication_subscriptions, site_standard_subscriptions, leaflets_to_documents, permission_token_rights, leaflets_in_publications } from "./schema";

export const notificationsRelations = relations(notifications, ({one}) => ({
	identity: one(identities, {
		fields: [notifications.recipient],
		references: [identities.atp_did]
	}),
}));

export const identitiesRelations = relations(identities, ({one, many}) => ({
	notifications: many(notifications),
	publications: many(publications),
	email_auth_tokens: many(email_auth_tokens),
	bsky_profiles: many(bsky_profiles),
	permission_token: one(permission_tokens, {
		fields: [identities.home_page],
		references: [permission_tokens.id]
	}),
	site_standard_publications: many(site_standard_publications),
	site_standard_documents: many(site_standard_documents),
	custom_domains_identity: many(custom_domains, {
		relationName: "custom_domains_identity_identities_email"
	}),
	custom_domains_identity_id: many(custom_domains, {
		relationName: "custom_domains_identity_id_identities_id"
	}),
	bsky_follows_follows: many(bsky_follows, {
		relationName: "bsky_follows_follows_identities_atp_did"
	}),
	bsky_follows_identity: many(bsky_follows, {
		relationName: "bsky_follows_identity_identities_atp_did"
	}),
	subscribers_to_publications: many(subscribers_to_publications),
	permission_token_on_homepages: many(permission_token_on_homepage),
	publication_domains: many(publication_domains),
	publication_subscriptions: many(publication_subscriptions),
	site_standard_subscriptions: many(site_standard_subscriptions),
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
	documents_in_publications: many(documents_in_publications),
	document_mentions_in_bskies: many(document_mentions_in_bsky),
	leaflets_to_documents: many(leaflets_to_documents),
	leaflets_in_publications: many(leaflets_in_publications),
}));

export const bsky_profilesRelations = relations(bsky_profiles, ({one, many}) => ({
	comments_on_documents: many(comments_on_documents),
	identity: one(identities, {
		fields: [bsky_profiles.did],
		references: [identities.atp_did]
	}),
}));

export const entitiesRelations = relations(entities, ({one, many}) => ({
	entity_set: one(entity_sets, {
		fields: [entities.set],
		references: [entity_sets.id]
	}),
	facts: many(facts),
	poll_votes_on_entities_option_entity: many(poll_votes_on_entity, {
		relationName: "poll_votes_on_entity_option_entity_entities_id"
	}),
	poll_votes_on_entities_poll_entity: many(poll_votes_on_entity, {
		relationName: "poll_votes_on_entity_poll_entity_entities_id"
	}),
	permission_tokens: many(permission_tokens),
	phone_rsvps_to_entities: many(phone_rsvps_to_entity),
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
}));

export const entity_setsRelations = relations(entity_sets, ({many}) => ({
	entities: many(entities),
	permission_token_rights: many(permission_token_rights),
}));

export const factsRelations = relations(facts, ({one}) => ({
	entity: one(entities, {
		fields: [facts.entity],
		references: [entities.id]
	}),
}));

export const email_auth_tokensRelations = relations(email_auth_tokens, ({one}) => ({
	identity: one(identities, {
		fields: [email_auth_tokens.identity],
		references: [identities.id]
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

export const permission_tokensRelations = relations(permission_tokens, ({one, many}) => ({
	entity: one(entities, {
		fields: [permission_tokens.root_entity],
		references: [entities.id]
	}),
	identities: many(identities),
	custom_domain_routes_edit_permission_token: many(custom_domain_routes, {
		relationName: "custom_domain_routes_edit_permission_token_permission_tokens_id"
	}),
	custom_domain_routes_view_permission_token: many(custom_domain_routes, {
		relationName: "custom_domain_routes_view_permission_token_permission_tokens_id"
	}),
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	permission_token_on_homepages: many(permission_token_on_homepage),
	leaflets_to_documents: many(leaflets_to_documents),
	permission_token_rights: many(permission_token_rights),
	leaflets_in_publications: many(leaflets_in_publications),
}));

export const phone_rsvps_to_entityRelations = relations(phone_rsvps_to_entity, ({one}) => ({
	entity: one(entities, {
		fields: [phone_rsvps_to_entity.entity],
		references: [entities.id]
	}),
}));

export const site_standard_publicationsRelations = relations(site_standard_publications, ({one, many}) => ({
	identity: one(identities, {
		fields: [site_standard_publications.identity_did],
		references: [identities.atp_did]
	}),
	site_standard_documents_in_publications: many(site_standard_documents_in_publications),
	site_standard_subscriptions: many(site_standard_subscriptions),
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

export const custom_domainsRelations = relations(custom_domains, ({one, many}) => ({
	custom_domain_routes: many(custom_domain_routes),
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
	publication_domains: many(publication_domains),
}));

export const site_standard_documentsRelations = relations(site_standard_documents, ({one, many}) => ({
	identity: one(identities, {
		fields: [site_standard_documents.identity_did],
		references: [identities.atp_did]
	}),
	site_standard_documents_in_publications: many(site_standard_documents_in_publications),
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

export const atp_poll_votesRelations = relations(atp_poll_votes, ({one}) => ({
	atp_poll_record: one(atp_poll_records, {
		fields: [atp_poll_votes.poll_uri],
		references: [atp_poll_records.uri]
	}),
}));

export const atp_poll_recordsRelations = relations(atp_poll_records, ({many}) => ({
	atp_poll_votes: many(atp_poll_votes),
}));

export const bsky_followsRelations = relations(bsky_follows, ({one}) => ({
	identity_follows: one(identities, {
		fields: [bsky_follows.follows],
		references: [identities.atp_did],
		relationName: "bsky_follows_follows_identities_atp_did"
	}),
	identity_identity: one(identities, {
		fields: [bsky_follows.identity],
		references: [identities.atp_did],
		relationName: "bsky_follows_identity_identities_atp_did"
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

export const site_standard_documents_in_publicationsRelations = relations(site_standard_documents_in_publications, ({one}) => ({
	site_standard_document: one(site_standard_documents, {
		fields: [site_standard_documents_in_publications.document],
		references: [site_standard_documents.uri]
	}),
	site_standard_publication: one(site_standard_publications, {
		fields: [site_standard_documents_in_publications.publication],
		references: [site_standard_publications.uri]
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

export const site_standard_subscriptionsRelations = relations(site_standard_subscriptions, ({one}) => ({
	identity: one(identities, {
		fields: [site_standard_subscriptions.identity],
		references: [identities.atp_did]
	}),
	site_standard_publication: one(site_standard_publications, {
		fields: [site_standard_subscriptions.publication],
		references: [site_standard_publications.uri]
	}),
}));

export const leaflets_to_documentsRelations = relations(leaflets_to_documents, ({one}) => ({
	document: one(documents, {
		fields: [leaflets_to_documents.document],
		references: [documents.uri]
	}),
	permission_token: one(permission_tokens, {
		fields: [leaflets_to_documents.leaflet],
		references: [permission_tokens.id]
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