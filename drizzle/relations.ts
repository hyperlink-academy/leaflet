import { relations } from "drizzle-orm/relations";
import { entities, facts, entity_sets, permission_tokens, identities, email_subscriptions_to_entity, email_auth_tokens, phone_rsvps_to_entity, custom_domains, custom_domain_routes, poll_votes_on_entity, subscribers_to_publications, publications, permission_token_on_homepage, documents, documents_in_publications, leaflets_in_publications, permission_token_rights } from "./schema";

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

export const identitiesRelations = relations(identities, ({one, many}) => ({
	permission_token: one(permission_tokens, {
		fields: [identities.home_page],
		references: [permission_tokens.id]
	}),
	email_auth_tokens: many(email_auth_tokens),
	custom_domains: many(custom_domains),
	subscribers_to_publications: many(subscribers_to_publications),
	permission_token_on_homepages: many(permission_token_on_homepage),
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

export const custom_domainsRelations = relations(custom_domains, ({one, many}) => ({
	custom_domain_routes: many(custom_domain_routes),
	identity: one(identities, {
		fields: [custom_domains.identity],
		references: [identities.email]
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

export const publicationsRelations = relations(publications, ({many}) => ({
	subscribers_to_publications: many(subscribers_to_publications),
	documents_in_publications: many(documents_in_publications),
	leaflets_in_publications: many(leaflets_in_publications),
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

export const documentsRelations = relations(documents, ({many}) => ({
	documents_in_publications: many(documents_in_publications),
	leaflets_in_publications: many(leaflets_in_publications),
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