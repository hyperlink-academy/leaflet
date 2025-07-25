import { pgTable, pgEnum, text, jsonb, foreignKey, timestamp, uuid, bigint, boolean, unique, uniqueIndex, smallint, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const aal_level = pgEnum("aal_level", ['aal1', 'aal2', 'aal3'])
export const code_challenge_method = pgEnum("code_challenge_method", ['s256', 'plain'])
export const factor_status = pgEnum("factor_status", ['unverified', 'verified'])
export const factor_type = pgEnum("factor_type", ['totp', 'webauthn'])
export const one_time_token_type = pgEnum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token'])
export const request_status = pgEnum("request_status", ['PENDING', 'SUCCESS', 'ERROR'])
export const key_status = pgEnum("key_status", ['default', 'valid', 'invalid', 'expired'])
export const key_type = pgEnum("key_type", ['aead-ietf', 'aead-det', 'hmacsha512', 'hmacsha256', 'auth', 'shorthash', 'generichash', 'kdf', 'secretbox', 'secretstream', 'stream_xchacha20'])
export const rsvp_status = pgEnum("rsvp_status", ['GOING', 'NOT_GOING', 'MAYBE'])
export const action = pgEnum("action", ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR'])
export const equality_op = pgEnum("equality_op", ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in'])


export const oauth_state_store = pgTable("oauth_state_store", {
	key: text("key").primaryKey().notNull(),
	state: jsonb("state").notNull(),
});

export const oauth_session_store = pgTable("oauth_session_store", {
	key: text("key").primaryKey().notNull(),
	session: jsonb("session").notNull(),
});

export const bsky_profiles = pgTable("bsky_profiles", {
	did: text("did").primaryKey().notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	record: jsonb("record").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	handle: text("handle"),
});

export const publications = pgTable("publications", {
	uri: text("uri").primaryKey().notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text("name").notNull(),
	identity_did: text("identity_did").notNull(),
	record: jsonb("record"),
});

export const bsky_posts = pgTable("bsky_posts", {
	uri: text("uri").primaryKey().notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	post_view: jsonb("post_view").notNull(),
	cid: text("cid").notNull(),
});

export const facts = pgTable("facts", {
	id: uuid("id").primaryKey().notNull(),
	entity: uuid("entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "restrict" } ),
	attribute: text("attribute").notNull(),
	data: jsonb("data").notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	version: bigint("version", { mode: "number" }).default(0).notNull(),
});

export const documents = pgTable("documents", {
	uri: text("uri").primaryKey().notNull(),
	data: jsonb("data").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const replicache_clients = pgTable("replicache_clients", {
	client_id: text("client_id").primaryKey().notNull(),
	client_group: text("client_group").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	last_mutation: bigint("last_mutation", { mode: "number" }).notNull(),
});

export const entities = pgTable("entities", {
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	set: uuid("set").notNull().references(() => entity_sets.id, { onDelete: "cascade", onUpdate: "cascade" } ),
});

export const entity_sets = pgTable("entity_sets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const permission_tokens = pgTable("permission_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	root_entity: uuid("root_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	blocked_by_admin: boolean("blocked_by_admin"),
});

export const identities = pgTable("identities", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	home_page: uuid("home_page").notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
	email: text("email"),
	atp_did: text("atp_did"),
},
(table) => {
	return {
		identities_email_key: unique("identities_email_key").on(table.email),
		identities_atp_did_key: unique("identities_atp_did_key").on(table.atp_did),
	}
});

export const email_subscriptions_to_entity = pgTable("email_subscriptions_to_entity", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	entity: uuid("entity").notNull().references(() => entities.id, { onDelete: "cascade" } ),
	email: text("email").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
	confirmed: boolean("confirmed").default(false).notNull(),
	confirmation_code: text("confirmation_code").notNull(),
});

export const email_auth_tokens = pgTable("email_auth_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	email: text("email"),
	confirmation_code: text("confirmation_code").notNull(),
	identity: uuid("identity").references(() => identities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
});

export const phone_number_auth_tokens = pgTable("phone_number_auth_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	confirmation_code: text("confirmation_code").notNull(),
	phone_number: text("phone_number").notNull(),
	country_code: text("country_code").notNull(),
});

export const custom_domains = pgTable("custom_domains", {
	domain: text("domain").primaryKey().notNull(),
	identity: text("identity").default('').references(() => identities.email, { onDelete: "cascade", onUpdate: "cascade" } ),
	confirmed: boolean("confirmed").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_id: uuid("identity_id").references(() => identities.id, { onDelete: "cascade" } ),
});

export const phone_rsvps_to_entity = pgTable("phone_rsvps_to_entity", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	phone_number: text("phone_number").notNull(),
	country_code: text("country_code").notNull(),
	status: rsvp_status("status").notNull(),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	entity: uuid("entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	name: text("name").default('').notNull(),
	plus_ones: smallint("plus_ones").default(0).notNull(),
},
(table) => {
	return {
		unique_phone_number_entities: uniqueIndex("unique_phone_number_entities").on(table.phone_number, table.entity),
	}
});

export const custom_domain_routes = pgTable("custom_domain_routes", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	domain: text("domain").notNull().references(() => custom_domains.domain),
	route: text("route").notNull(),
	edit_permission_token: uuid("edit_permission_token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	view_permission_token: uuid("view_permission_token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		custom_domain_routes_domain_route_key: unique("custom_domain_routes_domain_route_key").on(table.domain, table.route),
	}
});

export const poll_votes_on_entity = pgTable("poll_votes_on_entity", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	poll_entity: uuid("poll_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	option_entity: uuid("option_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	voter_token: uuid("voter_token").notNull(),
});

export const subscribers_to_publications = pgTable("subscribers_to_publications", {
	identity: text("identity").notNull().references(() => identities.email, { onUpdate: "cascade" } ),
	publication: text("publication").notNull().references(() => publications.uri),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		subscribers_to_publications_pkey: primaryKey({ columns: [table.identity, table.publication], name: "subscribers_to_publications_pkey"}),
	}
});

export const document_mentions_in_bsky = pgTable("document_mentions_in_bsky", {
	uri: text("uri").notNull().references(() => bsky_posts.uri, { onDelete: "cascade" } ),
	link: text("link").notNull(),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		document_mentions_in_bsky_pkey: primaryKey({ columns: [table.uri, table.document], name: "document_mentions_in_bsky_pkey"}),
	}
});

export const permission_token_on_homepage = pgTable("permission_token_on_homepage", {
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
	identity: uuid("identity").notNull().references(() => identities.id, { onDelete: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		permission_token_creator_pkey: primaryKey({ columns: [table.token, table.identity], name: "permission_token_creator_pkey"}),
	}
});

export const documents_in_publications = pgTable("documents_in_publications", {
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		documents_in_publications_pkey: primaryKey({ columns: [table.publication, table.document], name: "documents_in_publications_pkey"}),
	}
});

export const publication_domains = pgTable("publication_domains", {
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	domain: text("domain").notNull().references(() => custom_domains.domain, { onDelete: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity: text("identity").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		publication_domains_pkey: primaryKey({ columns: [table.publication, table.domain], name: "publication_domains_pkey"}),
	}
});

export const publication_subscriptions = pgTable("publication_subscriptions", {
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	identity: text("identity").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	record: jsonb("record").notNull(),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		publication_subscriptions_pkey: primaryKey({ columns: [table.publication, table.identity], name: "publication_subscriptions_pkey"}),
		publication_subscriptions_uri_key: unique("publication_subscriptions_uri_key").on(table.uri),
	}
});

export const leaflets_in_publications = pgTable("leaflets_in_publications", {
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	doc: text("doc").default('').references(() => documents.uri, { onDelete: "set null" } ),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
	description: text("description").default('').notNull(),
	title: text("title").default('').notNull(),
},
(table) => {
	return {
		leaflets_in_publications_pkey: primaryKey({ columns: [table.publication, table.leaflet], name: "leaflets_in_publications_pkey"}),
	}
});

export const permission_token_rights = pgTable("permission_token_rights", {
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	entity_set: uuid("entity_set").notNull().references(() => entity_sets.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	read: boolean("read").default(false).notNull(),
	write: boolean("write").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	create_token: boolean("create_token").default(false).notNull(),
	change_entity_set: boolean("change_entity_set").default(false).notNull(),
},
(table) => {
	return {
		permission_token_rights_pkey: primaryKey({ columns: [table.token, table.entity_set], name: "permission_token_rights_pkey"}),
	}
});