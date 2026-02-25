import { pgTable, pgEnum, text, jsonb, foreignKey, timestamp, boolean, uuid, index, bigint, unique, uniqueIndex, smallint, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const aal_level = pgEnum("aal_level", ['aal1', 'aal2', 'aal3'])
export const code_challenge_method = pgEnum("code_challenge_method", ['s256', 'plain'])
export const factor_status = pgEnum("factor_status", ['unverified', 'verified'])
export const factor_type = pgEnum("factor_type", ['totp', 'webauthn', 'phone'])
export const oauth_authorization_status = pgEnum("oauth_authorization_status", ['pending', 'approved', 'denied', 'expired'])
export const oauth_client_type = pgEnum("oauth_client_type", ['public', 'confidential'])
export const oauth_registration_type = pgEnum("oauth_registration_type", ['dynamic', 'manual'])
export const oauth_response_type = pgEnum("oauth_response_type", ['code'])
export const one_time_token_type = pgEnum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token'])
export const key_status = pgEnum("key_status", ['default', 'valid', 'invalid', 'expired'])
export const key_type = pgEnum("key_type", ['aead-ietf', 'aead-det', 'hmacsha512', 'hmacsha256', 'auth', 'shorthash', 'generichash', 'kdf', 'secretbox', 'secretstream', 'stream_xchacha20'])
export const rsvp_status = pgEnum("rsvp_status", ['GOING', 'NOT_GOING', 'MAYBE'])
export const action = pgEnum("action", ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR'])
export const equality_op = pgEnum("equality_op", ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in'])
export const buckettype = pgEnum("buckettype", ['STANDARD', 'ANALYTICS', 'VECTOR'])


export const oauth_state_store = pgTable("oauth_state_store", {
	key: text("key").primaryKey().notNull(),
	state: jsonb("state").notNull(),
});

export const notifications = pgTable("notifications", {
	recipient: text("recipient").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	read: boolean("read").default(false).notNull(),
	data: jsonb("data").notNull(),
	id: uuid("id").primaryKey().notNull(),
});

export const publications = pgTable("publications", {
	uri: text("uri").primaryKey().notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text("name").notNull(),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	record: jsonb("record"),
},
(table) => {
	return {
		identity_did_idx: index("publications_identity_did_idx").on(table.identity_did),
	}
});

export const comments_on_documents = pgTable("comments_on_documents", {
	uri: text("uri").primaryKey().notNull(),
	record: jsonb("record").notNull(),
	document: text("document").references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	profile: text("profile").references(() => bsky_profiles.did, { onDelete: "set null", onUpdate: "cascade" } ),
});

export const entities = pgTable("entities", {
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	set: uuid("set").notNull().references(() => entity_sets.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		set_idx: index("entities_set_idx").on(table.set),
	}
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
},
(table) => {
	return {
		entity_idx: index("facts_entity_idx").on(table.entity),
	}
});

export const replicache_clients = pgTable("replicache_clients", {
	client_id: text("client_id").primaryKey().notNull(),
	client_group: text("client_group").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	last_mutation: bigint("last_mutation", { mode: "number" }).notNull(),
},
(table) => {
	return {
		client_group_idx: index("replicache_clients_client_group_idx").on(table.client_group),
	}
});

export const email_auth_tokens = pgTable("email_auth_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	email: text("email"),
	confirmation_code: text("confirmation_code").notNull(),
	identity: uuid("identity").references(() => identities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
});

export const bsky_posts = pgTable("bsky_posts", {
	uri: text("uri").primaryKey().notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	post_view: jsonb("post_view").notNull(),
	cid: text("cid").notNull(),
});

export const bsky_profiles = pgTable("bsky_profiles", {
	did: text("did").primaryKey().notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	record: jsonb("record").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	handle: text("handle"),
});

export const entity_sets = pgTable("entity_sets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const poll_votes_on_entity = pgTable("poll_votes_on_entity", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	poll_entity: uuid("poll_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	option_entity: uuid("option_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	voter_token: uuid("voter_token").notNull(),
});

export const permission_tokens = pgTable("permission_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	root_entity: uuid("root_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	blocked_by_admin: boolean("blocked_by_admin"),
});

export const identities = pgTable("identities", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	home_page: uuid("home_page").default(sql`create_identity_homepage()`).notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
	email: text("email"),
	atp_did: text("atp_did"),
	interface_state: jsonb("interface_state"),
	metadata: jsonb("metadata"),
},
(table) => {
	return {
		identities_email_key: unique("identities_email_key").on(table.email),
		identities_atp_did_key: unique("identities_atp_did_key").on(table.atp_did),
	}
});

export const phone_number_auth_tokens = pgTable("phone_number_auth_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	confirmation_code: text("confirmation_code").notNull(),
	phone_number: text("phone_number").notNull(),
	country_code: text("country_code").notNull(),
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

export const site_standard_publications = pgTable("site_standard_publications", {
	uri: text("uri").primaryKey().notNull(),
	data: jsonb("data").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
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
		edit_permission_token_idx: index("custom_domain_routes_edit_permission_token_idx").on(table.edit_permission_token),
		custom_domain_routes_domain_route_key: unique("custom_domain_routes_domain_route_key").on(table.domain, table.route),
	}
});

export const site_standard_documents = pgTable("site_standard_documents", {
	uri: text("uri").primaryKey().notNull(),
	data: jsonb("data").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
});

export const custom_domains = pgTable("custom_domains", {
	domain: text("domain").primaryKey().notNull(),
	identity: text("identity").default('').references(() => identities.email, { onDelete: "cascade", onUpdate: "cascade" } ),
	confirmed: boolean("confirmed").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_id: uuid("identity_id").references(() => identities.id, { onDelete: "cascade" } ),
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

export const documents = pgTable("documents", {
	uri: text("uri").primaryKey().notNull(),
	data: jsonb("data").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const atp_poll_votes = pgTable("atp_poll_votes", {
	uri: text("uri").primaryKey().notNull(),
	record: jsonb("record").notNull(),
	voter_did: text("voter_did").notNull(),
	poll_uri: text("poll_uri").notNull().references(() => atp_poll_records.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	poll_cid: text("poll_cid").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		poll_uri_idx: index("atp_poll_votes_poll_uri_idx").on(table.poll_uri),
		voter_did_idx: index("atp_poll_votes_voter_did_idx").on(table.voter_did),
	}
});

export const atp_poll_records = pgTable("atp_poll_records", {
	uri: text("uri").primaryKey().notNull(),
	cid: text("cid").notNull(),
	record: jsonb("record").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const oauth_session_store = pgTable("oauth_session_store", {
	key: text("key").primaryKey().notNull(),
	session: jsonb("session").notNull(),
});

export const bsky_follows = pgTable("bsky_follows", {
	identity: text("identity").default('').notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	follows: text("follows").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
},
(table) => {
	return {
		bsky_follows_pkey: primaryKey({ columns: [table.identity, table.follows], name: "bsky_follows_pkey"}),
	}
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

export const site_standard_documents_in_publications = pgTable("site_standard_documents_in_publications", {
	publication: text("publication").notNull().references(() => site_standard_publications.uri, { onDelete: "cascade" } ),
	document: text("document").notNull().references(() => site_standard_documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		site_standard_documents_in_publications_pkey: primaryKey({ columns: [table.publication, table.document], name: "site_standard_documents_in_publications_pkey"}),
	}
});

export const documents_in_publications = pgTable("documents_in_publications", {
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		publication_idx: index("documents_in_publications_publication_idx").on(table.publication),
		documents_in_publications_pkey: primaryKey({ columns: [table.publication, table.document], name: "documents_in_publications_pkey"}),
	}
});

export const document_mentions_in_bsky = pgTable("document_mentions_in_bsky", {
	uri: text("uri").notNull().references(() => bsky_posts.uri, { onDelete: "cascade" } ),
	link: text("link").notNull(),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		document_mentions_in_bsky_pkey: primaryKey({ columns: [table.uri, table.document], name: "document_mentions_in_bsky_pkey"}),
	}
});

export const permission_token_on_homepage = pgTable("permission_token_on_homepage", {
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	identity: uuid("identity").notNull().references(() => identities.id, { onDelete: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	archived: boolean("archived"),
},
(table) => {
	return {
		permission_token_creator_pkey: primaryKey({ columns: [table.token, table.identity], name: "permission_token_creator_pkey"}),
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
		publication_idx: index("publication_domains_publication_idx").on(table.publication),
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
		publication_idx: index("publication_subscriptions_publication_idx").on(table.publication),
		publication_subscriptions_pkey: primaryKey({ columns: [table.publication, table.identity], name: "publication_subscriptions_pkey"}),
		publication_subscriptions_uri_key: unique("publication_subscriptions_uri_key").on(table.uri),
	}
});

export const site_standard_subscriptions = pgTable("site_standard_subscriptions", {
	publication: text("publication").notNull().references(() => site_standard_publications.uri, { onDelete: "cascade" } ),
	identity: text("identity").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	record: jsonb("record").notNull(),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		site_standard_subscriptions_pkey: primaryKey({ columns: [table.publication, table.identity], name: "site_standard_subscriptions_pkey"}),
		site_standard_subscriptions_uri_key: unique("site_standard_subscriptions_uri_key").on(table.uri),
	}
});

export const leaflets_to_documents = pgTable("leaflets_to_documents", {
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	title: text("title").default('').notNull(),
	description: text("description").default('').notNull(),
	tags: text("tags").default('RRAY[').array(),
	cover_image: text("cover_image"),
},
(table) => {
	return {
		leaflets_to_documents_pkey: primaryKey({ columns: [table.leaflet, table.document], name: "leaflets_to_documents_pkey"}),
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
		token_idx: index("permission_token_rights_token_idx").on(table.token),
		entity_set_idx: index("permission_token_rights_entity_set_idx").on(table.entity_set),
		permission_token_rights_pkey: primaryKey({ columns: [table.token, table.entity_set], name: "permission_token_rights_pkey"}),
	}
});

export const leaflets_in_publications = pgTable("leaflets_in_publications", {
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	doc: text("doc").default('').references(() => documents.uri, { onDelete: "set null" } ),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	description: text("description").default('').notNull(),
	title: text("title").default('').notNull(),
	archived: boolean("archived"),
	tags: text("tags").default('RRAY[').array(),
	cover_image: text("cover_image"),
},
(table) => {
	return {
		leaflet_idx: index("leaflets_in_publications_leaflet_idx").on(table.leaflet),
		publication_idx: index("leaflets_in_publications_publication_idx").on(table.publication),
		leaflets_in_publications_pkey: primaryKey({ columns: [table.publication, table.leaflet], name: "leaflets_in_publications_pkey"}),
	}
});

export const user_subscriptions = pgTable("user_subscriptions", {
	identity_id: uuid("identity_id").primaryKey().notNull().references(() => identities.id, { onDelete: "cascade" }),
	stripe_customer_id: text("stripe_customer_id").notNull(),
	stripe_subscription_id: text("stripe_subscription_id"),
	plan: text("plan"),
	status: text("status"),
	current_period_end: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		user_subscriptions_stripe_customer_id_key: unique("user_subscriptions_stripe_customer_id_key").on(table.stripe_customer_id),
		user_subscriptions_stripe_subscription_id_key: unique("user_subscriptions_stripe_subscription_id_key").on(table.stripe_subscription_id),
	}
});

export const user_entitlements = pgTable("user_entitlements", {
	identity_id: uuid("identity_id").notNull().references(() => identities.id, { onDelete: "cascade" }),
	entitlement_key: text("entitlement_key").notNull(),
	granted_at: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	source: text("source"),
	metadata: jsonb("metadata"),
},
(table) => {
	return {
		identity_id_idx: index("user_entitlements_identity_id_idx").on(table.identity_id),
		expires_at_idx: index("user_entitlements_expires_at_idx").on(table.expires_at),
		user_entitlements_pkey: primaryKey({ columns: [table.identity_id, table.entitlement_key], name: "user_entitlements_pkey"}),
	}
});