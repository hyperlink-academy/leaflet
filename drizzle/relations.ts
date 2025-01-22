import { relations } from "drizzle-orm/relations";
import { entities, facts, entity_sets, permission_tokens, identities, email_subscriptions_to_entity, email_auth_tokens, custom_domains, custom_domain_routes, phone_rsvps_to_entity, permission_token_on_homepage, permission_token_rights } from "./schema";

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
	permission_token_rights: many(permission_token_rights),
}));

export const identitiesRelations = relations(identities, ({one, many}) => ({
	permission_token: one(permission_tokens, {
		fields: [identities.home_page],
		references: [permission_tokens.id]
	}),
	email_auth_tokens: many(email_auth_tokens),
	custom_domains: many(custom_domains),
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

export const custom_domainsRelations = relations(custom_domains, ({one, many}) => ({
	identity: one(identities, {
		fields: [custom_domains.identity],
		references: [identities.email]
	}),
	custom_domain_routes: many(custom_domain_routes),
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

export const phone_rsvps_to_entityRelations = relations(phone_rsvps_to_entity, ({one}) => ({
	entity: one(entities, {
		fields: [phone_rsvps_to_entity.entity],
		references: [entities.id]
	}),
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