import { relations } from "drizzle-orm/relations";
import { entities, facts } from "./schema";

export const factsRelations = relations(facts, ({one}) => ({
	entity: one(entities, {
		fields: [facts.entity],
		references: [entities.id]
	}),
}));

export const entitiesRelations = relations(entities, ({many}) => ({
	facts: many(facts),
}));