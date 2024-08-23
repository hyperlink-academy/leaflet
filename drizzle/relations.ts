import { relations } from "drizzle-orm/relations";
import { entity_sets, entities, email_subscriptions_to_entity, permission_tokens, identities, facts, permission_token_rights } from "./schema";

export const entitiesRelations = relations(entities, ({one, many}) => ({
	entity_set: one(entity_sets, {
		fields: [entities.set],
		references: [entity_sets.id]
	}),
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	permission_tokens: many(permission_tokens),
	facts: many(facts),
}));

export const entity_setsRelations = relations(entity_sets, ({many}) => ({
	entities: many(entities),
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

export const permission_tokensRelations = relations(permission_tokens, ({one, many}) => ({
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	identities: many(identities),
	entity: one(entities, {
		fields: [permission_tokens.root_entity],
		references: [entities.id]
	}),
	permission_token_rights: many(permission_token_rights),
}));

export const identitiesRelations = relations(identities, ({one}) => ({
	permission_token: one(permission_tokens, {
		fields: [identities.home_page],
		references: [permission_tokens.id]
	}),
}));

export const factsRelations = relations(facts, ({one}) => ({
	entity: one(entities, {
		fields: [facts.entity],
		references: [entities.id]
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