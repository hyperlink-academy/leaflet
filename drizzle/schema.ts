import { bigint, boolean, foreignKey, index, integer, jsonb, pgEnum, pgTable, primaryKey, smallint, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const rsvp_status = pgEnum("rsvp_status", ['GOING', 'NOT_GOING', 'MAYBE'])

export const atp_poll_records = pgTable("atp_poll_records", {
	cid: text("cid").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
});

export const atp_poll_votes = pgTable("atp_poll_votes", {
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	poll_cid: text("poll_cid").notNull(),
	poll_uri: text("poll_uri").notNull().references(() => atp_poll_records.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
	voter_did: text("voter_did").notNull(),
},
(table) => {
	return {
		poll_uri_idx: index("atp_poll_votes_poll_uri_idx").on(table.poll_uri),
		voter_did_idx: index("atp_poll_votes_voter_did_idx").on(table.voter_did),
	}
});

export const blob_cleanup_queue = pgTable("blob_cleanup_queue", {
	path: text("path").primaryKey().notNull(),
	queued_at: timestamp("queued_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const bsky_follows = pgTable("bsky_follows", {
	follows: text("follows").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	identity: text("identity").default('').notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
},
(table) => {
	return {
		bsky_follows_pkey: primaryKey({ columns: [table.identity, table.follows], name: "bsky_follows_pkey"}),
	}
});

export const bsky_posts = pgTable("bsky_posts", {
	cid: text("cid").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	post_view: jsonb("post_view").notNull(),
	uri: text("uri").primaryKey().notNull(),
});

export const bsky_profiles = pgTable("bsky_profiles", {
	did: text("did").primaryKey().notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	handle: text("handle"),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	record: jsonb("record").notNull(),
});

export const comment_tombstones = pgTable("comment_tombstones", {
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	document: text("document").references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		document_idx: index("comment_tombstones_document_idx").on(table.document),
	}
});

export const comments_on_documents = pgTable("comments_on_documents", {
	document: text("document").references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	past_versions: jsonb("past_versions").default([]).notNull(),
	profile: text("profile"),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		document_idx: index("comments_on_documents_document_idx").on(table.document),
	}
});

export const custom_domain_routes = pgTable("custom_domain_routes", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	domain: text("domain").notNull().references(() => custom_domains.domain),
	edit_permission_token: uuid("edit_permission_token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	route: text("route").notNull(),
	view_permission_token: uuid("view_permission_token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		custom_domain_routes_domain_route_key: unique("custom_domain_routes_domain_route_key").on(table.domain, table.route),
		edit_permission_token_idx: index("custom_domain_routes_edit_permission_token_idx").on(table.edit_permission_token),
	}
});

export const custom_domains = pgTable("custom_domains", {
	confirmed: boolean("confirmed").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	domain: text("domain").primaryKey().notNull(),
	identity: text("identity").default('').references(() => identities.email, { onDelete: "cascade", onUpdate: "cascade" } ),
	identity_id: uuid("identity_id").references(() => identities.id, { onDelete: "cascade" } ),
});

export const document_mentions_in_bsky = pgTable("document_mentions_in_bsky", {
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	link: text("link").notNull(),
	uri: text("uri").notNull().references(() => bsky_posts.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		document_idx: index("document_mentions_in_bsky_document_idx").on(table.document),
		document_mentions_in_bsky_pkey: primaryKey({ columns: [table.uri, table.document], name: "document_mentions_in_bsky_pkey"}),
	}
});

export const document_question_answers = pgTable("document_question_answers", {
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	question: text("question").notNull().references(() => document_questions.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	record: jsonb("record").notNull(),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		document_question_answers_question_key: unique("document_question_answers_question_key").on(table.question),
		subject_idx: index("document_question_answers_subject_idx").on(table.subject),
	}
});

export const document_question_visibility = pgTable("document_question_visibility", {
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	question: text("question").notNull(),
	state: text("state").notNull(),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		document_question_visibility_pkey: primaryKey({ columns: [table.subject, table.question], name: "document_question_visibility_pkey"}),
		uri_idx: index("document_question_visibility_uri_idx").on(table.uri),
	}
});

export const document_questions = pgTable("document_questions", {
	asker_did: text("asker_did").notNull(),
	cid: text("cid").notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	record: jsonb("record").notNull(),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		subject_idx: index("document_questions_subject_idx").on(table.subject),
	}
});

export const document_replies = pgTable("document_replies", {
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	record: jsonb("record").notNull(),
	replier_did: text("replier_did").notNull(),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		document_idx: index("document_replies_document_idx").on(table.document),
		document_replies_subject_document_key: unique("document_replies_subject_document_key").on(table.subject, table.document),
	}
});

export const document_reply_rejections = pgTable("document_reply_rejections", {
	rejected_at: timestamp("rejected_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reply: text("reply").primaryKey().notNull().references(() => document_replies.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		subject_idx: index("document_reply_rejections_subject_idx").on(table.subject),
	}
});

export const document_reply_visibility = pgTable("document_reply_visibility", {
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reply: text("reply").notNull(),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		document_reply_visibility_pkey: primaryKey({ columns: [table.subject, table.reply], name: "document_reply_visibility_pkey"}),
		uri_idx: index("document_reply_visibility_uri_idx").on(table.uri),
	}
});

export const document_tags = pgTable("document_tags", {
	tag: text("tag").notNull(),
	uri: text("uri").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		document_tags_pkey: primaryKey({ columns: [table.uri, table.tag], name: "document_tags_pkey"}),
		idx_document_tags_tag: index("idx_document_tags_tag").on(table.tag),
	}
});

export const document_version_blob_refs = pgTable("document_version_blob_refs", {
	path: text("path").notNull(),
	version: uuid("version").notNull().references(() => document_versions.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		document_version_blob_refs_pkey: primaryKey({ columns: [table.version, table.path], name: "document_version_blob_refs_pkey"}),
		path_idx: index("document_version_blob_refs_path_idx").on(table.path),
	}
});

export const document_versions = pgTable("document_versions", {
	author_did: text("author_did"),
	author_identity: uuid("author_identity").references(() => identities.id, { onDelete: "set null" } ),
	byte_size: integer("byte_size").notNull(),
	closure_hash: text("closure_hash").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	fact_count: integer("fact_count").notNull(),
	id: uuid("id").primaryKey().notNull(),
	kind: text("kind").default('named').notNull(),
	name: text("name"),
	snapshot: jsonb("snapshot"),
	snapshot_path: text("snapshot_path"),
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		token_created_at_idx: index("document_versions_token_created_at_idx").on(table.token, table.created_at),
	}
});

export const documents = pgTable("documents", {
	bsky_like_count: integer("bsky_like_count").default(0).notNull(),
	data: jsonb("data").notNull(),
	identity_did: text("identity_did"),
	indexed: boolean("indexed").default(false).notNull(),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	recommend_count: integer("recommend_count").default(0).notNull(),
	sort_date: timestamp("sort_date", { withTimezone: true, mode: 'string' }),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		feed_idx: index("documents_feed_idx").on(table.uri, table.sort_date),
		identity_did_sort_idx: index("documents_identity_did_sort_idx").on(table.uri, table.sort_date, table.identity_did),
		idx_documents_ranking: index("idx_documents_ranking").on(table.uri, table.sort_date, table.bsky_like_count, table.recommend_count),
		indexed_at_idx: index("documents_indexed_at_idx").on(table.indexed_at),
		sort_date_idx: index("documents_sort_date_idx").on(table.uri, table.sort_date),
	}
});

export const documents_in_publications = pgTable("documents_in_publications", {
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	members_only: boolean("members_only").default(false).notNull(),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		document_idx: index("documents_in_publications_document_idx").on(table.document),
		documents_in_publications_pkey: primaryKey({ columns: [table.publication, table.document], name: "documents_in_publications_pkey"}),
		publication_idx: index("documents_in_publications_publication_idx").on(table.publication),
	}
});

export const email_auth_tokens = pgTable("email_auth_tokens", {
	confirmation_code: text("confirmation_code").notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: text("email"),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	identity: uuid("identity").references(() => identities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
});

export const email_render_images = pgTable("email_render_images", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	key: text("key").primaryKey().notNull(),
	spec: jsonb("spec").notNull(),
});

export const email_subscriptions_to_entity = pgTable("email_subscriptions_to_entity", {
	confirmation_code: text("confirmation_code").notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: text("email").notNull(),
	entity: uuid("entity").notNull().references(() => entities.id, { onDelete: "cascade" } ),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
});

export const entities = pgTable("entities", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	id: uuid("id").primaryKey().notNull(),
	set: uuid("set").notNull().references(() => entity_sets.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		set_idx: index("entities_set_idx").on(table.set),
	}
});

export const entity_sets = pgTable("entity_sets", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
});

export const facts = pgTable("facts", {
	attribute: text("attribute").notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	data: jsonb("data").notNull(),
	entity: uuid("entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "restrict" } ),
	id: uuid("id").primaryKey().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	author_did: text("author_did"),
	version: bigint("version", { mode: "number" }).default(0).notNull(),
},
(table) => {
	return {
		entity_idx: index("facts_entity_idx").on(table.entity),
	}
});

export const identities = pgTable("identities", {
	atp_did: text("atp_did"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: text("email"),
	home_page: uuid("home_page").default(sql`create_identity_homepage()`).notNull().references(() => permission_tokens.id, { onDelete: "cascade" } ),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	interface_state: jsonb("interface_state"),
	metadata: jsonb("metadata"),
	tutorial: boolean("tutorial").default(true).notNull(),
},
(table) => {
	return {
		identities_atp_did_key: unique("identities_atp_did_key").on(table.atp_did),
		identities_email_key: unique("identities_email_key").on(table.email),
	}
});

export const leaflet_contributors = pgTable("leaflet_contributors", {
	contributor_did: text("contributor_did").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		contributor_did_idx: index("leaflet_contributors_contributor_did_idx").on(table.contributor_did),
		leaflet_contributors_pkey: primaryKey({ columns: [table.leaflet, table.contributor_did], name: "leaflet_contributors_pkey"}),
	}
});

export const leaflets_in_publications = pgTable("leaflets_in_publications", {
	archived: boolean("archived"),
	cover_image: text("cover_image"),
	description: text("description").default('').notNull(),
	doc: text("doc").default('').references(() => documents.uri, { onDelete: "set null" } ),
	email_only: boolean("email_only").default(false).notNull(),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	preferences: jsonb("preferences"),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	reply_to: text("reply_to"),
	reply_to_block: text("reply_to_block"),
	scheduled_publish_at: timestamp("scheduled_publish_at", { withTimezone: true, mode: 'string' }),
	scheduled_publish_data: jsonb("scheduled_publish_data"),
	tags: text("tags").default('RRAY[').array(),
	title: text("title").default('').notNull(),
},
(table) => {
	return {
		doc_idx: index("leaflets_in_publications_doc_idx").on(table.doc),
		leaflet_idx: index("leaflets_in_publications_leaflet_idx").on(table.leaflet),
		leaflets_in_publications_pkey: primaryKey({ columns: [table.publication, table.leaflet], name: "leaflets_in_publications_pkey"}),
		publication_idx: index("leaflets_in_publications_publication_idx").on(table.publication),
	}
});

export const leaflets_to_documents = pgTable("leaflets_to_documents", {
	cover_image: text("cover_image"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	description: text("description").default('').notNull(),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	preferences: jsonb("preferences"),
	scheduled_publish_at: timestamp("scheduled_publish_at", { withTimezone: true, mode: 'string' }),
	scheduled_publish_data: jsonb("scheduled_publish_data"),
	tags: text("tags").default('RRAY[').array(),
	title: text("title").default('').notNull(),
},
(table) => {
	return {
		leaflets_to_documents_pkey: primaryKey({ columns: [table.leaflet, table.document], name: "leaflets_to_documents_pkey"}),
	}
});

export const mention_service_configs = pgTable("mention_service_configs", {
	identity_did: text("identity_did").notNull(),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		idx_mention_service_configs_did: index("idx_mention_service_configs_did").on(table.identity_did),
		mention_service_configs_identity_did_key: unique("mention_service_configs_identity_did_key").on(table.identity_did),
	}
});

export const mention_services = pgTable("mention_services", {
	identity_did: text("identity_did").notNull(),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		idx_mention_services_did: index("idx_mention_services_did").on(table.identity_did),
	}
});

export const notifications = pgTable("notifications", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	data: jsonb("data").notNull(),
	id: uuid("id").primaryKey().notNull(),
	read: boolean("read").default(false).notNull(),
	recipient: text("recipient").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		recipient_created_at_id_idx: index("notifications_recipient_created_at_id_idx").on(table.recipient, table.created_at, table.id),
		recipient_unread_idx: index("notifications_recipient_unread_idx").on(table.recipient),
	}
});

export const oauth_session_store = pgTable("oauth_session_store", {
	key: text("key").primaryKey().notNull(),
	session: jsonb("session").notNull(),
});

export const oauth_state_store = pgTable("oauth_state_store", {
	key: text("key").primaryKey().notNull(),
	state: jsonb("state").notNull(),
});

export const permission_token_on_homepage = pgTable("permission_token_on_homepage", {
	archived: boolean("archived"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity: uuid("identity").notNull().references(() => identities.id, { onDelete: "cascade" } ),
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		permission_token_creator_pkey: primaryKey({ columns: [table.token, table.identity], name: "permission_token_creator_pkey"}),
	}
});

export const permission_token_rights = pgTable("permission_token_rights", {
	change_entity_set: boolean("change_entity_set").default(false).notNull(),
	create_token: boolean("create_token").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	entity_set: uuid("entity_set").notNull().references(() => entity_sets.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	read: boolean("read").default(false).notNull(),
	token: uuid("token").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	write: boolean("write").default(false).notNull(),
},
(table) => {
	return {
		entity_set_idx: index("permission_token_rights_entity_set_idx").on(table.entity_set),
		permission_token_rights_pkey: primaryKey({ columns: [table.token, table.entity_set], name: "permission_token_rights_pkey"}),
		token_idx: index("permission_token_rights_token_idx").on(table.token),
	}
});

export const permission_tokens = pgTable("permission_tokens", {
	blocked_by_admin: boolean("blocked_by_admin"),
	description: text("description"),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	root_entity: uuid("root_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title"),
});

export const phone_number_auth_tokens = pgTable("phone_number_auth_tokens", {
	confirmation_code: text("confirmation_code").notNull(),
	confirmed: boolean("confirmed").default(false).notNull(),
	country_code: text("country_code").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	phone_number: text("phone_number").notNull(),
});

export const phone_rsvps_to_entity = pgTable("phone_rsvps_to_entity", {
	country_code: text("country_code").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	entity: uuid("entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").default('').notNull(),
	phone_number: text("phone_number").notNull(),
	plus_ones: smallint("plus_ones").default(0).notNull(),
	status: rsvp_status("status").notNull(),
},
(table) => {
	return {
		unique_phone_number_entities: uniqueIndex("unique_phone_number_entities").on(table.phone_number, table.entity),
	}
});

export const poll_votes_on_entity = pgTable("poll_votes_on_entity", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	option_entity: uuid("option_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	poll_entity: uuid("poll_entity").notNull().references(() => entities.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	voter_token: uuid("voter_token").notNull(),
});

export const publication_contributors = pgTable("publication_contributors", {
	confirmed: boolean("confirmed").default(false).notNull(),
	contributor_did: text("contributor_did").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publication_uri: text("publication_uri").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		contributor_did_idx: index("publication_contributors_contributor_did_idx").on(table.contributor_did),
		publication_contributors_pkey: primaryKey({ columns: [table.publication_uri, table.contributor_did], name: "publication_contributors_pkey"}),
	}
});

export const publication_domains = pgTable("publication_domains", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	domain: text("domain").notNull().references(() => custom_domains.domain, { onDelete: "cascade" } ),
	identity: text("identity").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		publication_domains_pkey: primaryKey({ columns: [table.publication, table.domain], name: "publication_domains_pkey"}),
		publication_idx: index("publication_domains_publication_idx").on(table.publication),
	}
});

export const publication_email_posts = pgTable("publication_email_posts", {
	audience: text("audience").default('all').notNull(),
	byline_dids: text("byline_dids").default('{}').array().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: text("created_by").notNull(),
	description: text("description").default('').notNull(),
	error: text("error"),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	image_paths: text("image_paths").default('{}').array().notNull(),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	pages: jsonb("pages").notNull(),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	revision: integer("revision").default(0).notNull(),
	send_at: timestamp("send_at", { withTimezone: true, mode: 'string' }),
	send_mode: text("send_mode").notNull(),
	sent_at: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	status: text("status").notNull(),
	subscriber_count: integer("subscriber_count"),
	title: text("title").default('').notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		image_paths_idx: index("publication_email_posts_image_paths_idx").on(table.image_paths),
		leaflet_key: uniqueIndex("publication_email_posts_leaflet_key").on(table.leaflet),
		one_on_subscribe: uniqueIndex("publication_email_posts_one_on_subscribe").on(table.publication, table.audience),
		publication_idx: index("publication_email_posts_publication_idx").on(table.publication),
	}
});

export const publication_email_subscriber_events = pgTable("publication_email_subscriber_events", {
	event_type: text("event_type").notNull(),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	metadata: jsonb("metadata"),
	occurred_at: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	subscriber: uuid("subscriber").notNull().references(() => publication_email_subscribers.id, { onDelete: "cascade" } ),
},
(table) => {
	return {
		publication_type_idx: index("publication_email_subscriber_events_publication_type_idx").on(table.publication, table.event_type, table.occurred_at),
		subscriber_idx: index("publication_email_subscriber_events_subscriber_idx").on(table.subscriber, table.occurred_at),
	}
});

export const publication_email_subscribers = pgTable("publication_email_subscribers", {
	confirmation_code: text("confirmation_code"),
	confirmed_at: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: text("email").notNull(),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	identity_id: uuid("identity_id").references(() => identities.id, { onDelete: "set null" } ),
	metadata: jsonb("metadata"),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	state: text("state").default('pending').notNull(),
	unsubscribe_token: uuid("unsubscribe_token").defaultRandom().notNull(),
	unsubscribed_at: timestamp("unsubscribed_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		confirmed_idx: index("publication_email_subscribers_confirmed_idx").on(table.publication),
		publication_email_subscribers_publication_email_key: unique("publication_email_subscribers_publication_email_key").on(table.publication, table.email),
		publication_email_subscribers_unsubscribe_token_key: unique("publication_email_subscribers_unsubscribe_token_key").on(table.unsubscribe_token),
	}
});

export const publication_membership_settings = pgTable("publication_membership_settings", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	enabled: boolean("enabled").default(false).notNull(),
	publication: text("publication").primaryKey().notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	subscriber_tier_description: text("subscriber_tier_description").default('Subscribe for free to get notified about new posts.'),
	subscriber_tier_name: text("subscriber_tier_name").default('Free').notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		enabled_idx: index("publication_membership_settings_enabled_idx").on(table.publication),
	}
});

export const publication_membership_tiers = pgTable("publication_membership_tiers", {
	active: boolean("active").default(false).notNull(),
	annual_price_cents: integer("annual_price_cents"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	currency: text("currency").default('usd').notNull(),
	description: text("description"),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	monthly_price_cents: integer("monthly_price_cents").notNull(),
	name: text("name").notNull(),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	sort_order: integer("sort_order").default(0).notNull(),
	stripe_price_annual_id: text("stripe_price_annual_id"),
	stripe_price_monthly_id: text("stripe_price_monthly_id"),
	stripe_product_id: text("stripe_product_id"),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		publication_idx: index("publication_membership_tiers_publication_idx").on(table.publication),
		publication_membership_tiers_id_publication_key: unique("publication_membership_tiers_id_publication_key").on(table.id, table.publication),
	}
});

export const publication_memberships = pgTable("publication_memberships", {
	cadence: text("cadence"),
	cancel_at_period_end: boolean("cancel_at_period_end").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	current_period_end: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	identity_id: uuid("identity_id").notNull().references(() => identities.id, { onDelete: "cascade" } ),
	pending_cadence: text("pending_cadence"),
	pending_tier: uuid("pending_tier").references(() => publication_membership_tiers.id, { onDelete: "set null" } ),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	status: text("status"),
	stripe_account_id: text("stripe_account_id"),
	stripe_customer_id: text("stripe_customer_id"),
	stripe_price_id: text("stripe_price_id"),
	stripe_subscription_id: text("stripe_subscription_id"),
	tier: uuid("tier").notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		identity_idx: index("publication_memberships_identity_idx").on(table.identity_id),
		publication_memberships_publication_identity_key: unique("publication_memberships_publication_identity_key").on(table.publication, table.identity_id),
		publication_memberships_tier_publication_fkey: foreignKey({
			columns: [table.tier, table.publication],
			foreignColumns: [publication_membership_tiers.id, publication_membership_tiers.publication],
			name: "publication_memberships_tier_publication_fkey"
		}),
		stripe_subscription_id_key: uniqueIndex("publication_memberships_stripe_subscription_id_key").on(table.stripe_subscription_id),
	}
});

export const publication_newsletter_settings = pgTable("publication_newsletter_settings", {
	confirmation_code: text("confirmation_code"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	embed_redirect_url: text("embed_redirect_url"),
	enabled: boolean("enabled").default(false).notNull(),
	publication: text("publication").primaryKey().notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	reply_to_email: text("reply_to_email"),
	reply_to_verified_at: timestamp("reply_to_verified_at", { withTimezone: true, mode: 'string' }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		enabled_idx: index("publication_newsletter_settings_enabled_idx").on(table.publication),
	}
});

export const publication_pages = pgTable("publication_pages", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	document: text("document").references(() => documents.uri),
	id: bigint("id", { mode: "number" }).notNull(),
	leaflet_src: uuid("leaflet_src").references(() => permission_tokens.id),
	metadata: jsonb("metadata").default({}).notNull(),
	page_entity: uuid("page_entity"),
	path: text("path"),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	published_metadata: jsonb("published_metadata"),
	record: jsonb("record"),
	record_uri: text("record_uri"),
	sort_order: text("sort_order").notNull(),
	title: text("title").default('').notNull(),
},
(table) => {
	return {
		publication_page_entity_idx: uniqueIndex("publication_pages_publication_page_entity_idx").on(table.publication, table.page_entity),
		publication_pages_pkey: primaryKey({ columns: [table.id, table.publication], name: "publication_pages_pkey"}),
	}
});

export const publication_post_sends = pgTable("publication_post_sends", {
	completed_at: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade" } ),
	error: text("error"),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	started_at: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: text("status").default('pending').notNull(),
	subscriber_count: integer("subscriber_count"),
},
(table) => {
	return {
		publication_post_sends_pkey: primaryKey({ columns: [table.publication, table.document], name: "publication_post_sends_pkey"}),
		publication_started_idx: index("publication_post_sends_publication_started_idx").on(table.publication, table.started_at),
	}
});

export const publication_recommendations = pgTable("publication_recommendations", {
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	recommendation: text("recommendation").notNull(),
	sort_order: integer("sort_order").notNull(),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		publication_recommendations_pkey: primaryKey({ columns: [table.publication, table.recommendation], name: "publication_recommendations_pkey"}),
		recommendation_idx: index("publication_recommendations_recommendation_idx").on(table.recommendation),
		uri_idx: index("publication_recommendations_uri_idx").on(table.uri),
	}
});

export const publication_scheduled_posts = pgTable("publication_scheduled_posts", {
	bsky_post: jsonb("bsky_post"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: text("created_by").notNull(),
	error: text("error"),
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	leaflet: uuid("leaflet").notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	publish_at: timestamp("publish_at", { withTimezone: true, mode: 'string' }).notNull(),
	revision: integer("revision").default(0).notNull(),
	send_email: boolean("send_email").default(true).notNull(),
	show_in_discover: boolean("show_in_discover").default(true).notNull(),
	status: text("status").default('scheduled').notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		publication_idx: index("publication_scheduled_posts_publication_idx").on(table.publication),
		publication_scheduled_posts_leaflet_key: unique("publication_scheduled_posts_leaflet_key").on(table.leaflet),
	}
});

export const publication_subscriptions = pgTable("publication_subscriptions", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity: text("identity").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	publication: text("publication").notNull().references(() => publications.uri, { onDelete: "cascade" } ),
	record: jsonb("record").notNull(),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		identity_idx: index("publication_subscriptions_identity_idx").on(table.identity),
		publication_idx: index("publication_subscriptions_publication_idx").on(table.publication),
		publication_subscriptions_pkey: primaryKey({ columns: [table.publication, table.identity], name: "publication_subscriptions_pkey"}),
		publication_subscriptions_uri_key: unique("publication_subscriptions_uri_key").on(table.uri),
	}
});

export const publications = pgTable("publications", {
	draft_leaflet: uuid("draft_leaflet").references(() => permission_tokens.id),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text("name").notNull(),
	record: jsonb("record"),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		identity_did_idx: index("publications_identity_did_idx").on(table.identity_did),
	}
});

export const recommends_on_documents = pgTable("recommends_on_documents", {
	document: text("document").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	recommender_did: text("recommender_did").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
	record: jsonb("record").notNull(),
	uri: text("uri").primaryKey().notNull(),
},
(table) => {
	return {
		document_idx: index("recommends_on_documents_document_idx").on(table.document),
		recommender_did_idx: index("recommends_on_documents_recommender_did_idx").on(table.recommender_did),
		recommender_document_idx: uniqueIndex("recommends_on_documents_recommender_document_idx").on(table.document, table.recommender_did),
	}
});

export const replicache_clients = pgTable("replicache_clients", {
	client_group: text("client_group").notNull(),
	client_id: text("client_id").primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	last_mutation: bigint("last_mutation", { mode: "number" }).notNull(),
},
(table) => {
	return {
		client_group_idx: index("replicache_clients_client_group_idx").on(table.client_group),
	}
});

export const reply_drafts = pgTable("reply_drafts", {
	block: text("block"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade", onUpdate: "cascade" } ),
	leaflet: uuid("leaflet").primaryKey().notNull().references(() => permission_tokens.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	subject: text("subject").notNull().references(() => documents.uri, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		subject_idx: index("reply_drafts_subject_idx").on(table.subject),
	}
});

export const site_standard_documents = pgTable("site_standard_documents", {
	data: jsonb("data").notNull(),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uri: text("uri").primaryKey().notNull(),
});

export const site_standard_documents_in_publications = pgTable("site_standard_documents_in_publications", {
	document: text("document").notNull().references(() => site_standard_documents.uri, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publication: text("publication").notNull().references(() => site_standard_publications.uri, { onDelete: "cascade" } ),
},
(table) => {
	return {
		site_standard_documents_in_publications_pkey: primaryKey({ columns: [table.publication, table.document], name: "site_standard_documents_in_publications_pkey"}),
	}
});

export const site_standard_publications = pgTable("site_standard_publications", {
	data: jsonb("data").notNull(),
	identity_did: text("identity_did").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	indexed_at: timestamp("indexed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uri: text("uri").primaryKey().notNull(),
});

export const site_standard_subscriptions = pgTable("site_standard_subscriptions", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity: text("identity").notNull().references(() => identities.atp_did, { onDelete: "cascade" } ),
	publication: text("publication").notNull().references(() => site_standard_publications.uri, { onDelete: "cascade" } ),
	record: jsonb("record").notNull(),
	uri: text("uri").notNull(),
},
(table) => {
	return {
		site_standard_subscriptions_pkey: primaryKey({ columns: [table.publication, table.identity], name: "site_standard_subscriptions_pkey"}),
		site_standard_subscriptions_uri_key: unique("site_standard_subscriptions_uri_key").on(table.uri),
	}
});

export const stripe_connected_accounts = pgTable("stripe_connected_accounts", {
	charges_enabled: boolean("charges_enabled").default(false).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	details_submitted: boolean("details_submitted").default(false).notNull(),
	identity_id: uuid("identity_id").primaryKey().notNull().references(() => identities.id, { onDelete: "cascade" } ),
	payouts_enabled: boolean("payouts_enabled").default(false).notNull(),
	requirements: jsonb("requirements"),
	stripe_account_id: text("stripe_account_id").notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stripe_account_id_key: uniqueIndex("stripe_connected_accounts_stripe_account_id_key").on(table.stripe_account_id),
	}
});

export const stripe_connected_customers = pgTable("stripe_connected_customers", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_id: uuid("identity_id").notNull().references(() => identities.id, { onDelete: "cascade" } ),
	stripe_account_id: text("stripe_account_id").notNull(),
	stripe_customer_id: text("stripe_customer_id").notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stripe_connected_customers_pkey: primaryKey({ columns: [table.identity_id, table.stripe_account_id], name: "stripe_connected_customers_pkey"}),
	}
});

export const stripe_wallets = pgTable("stripe_wallets", {
	card_brand: text("card_brand"),
	card_exp_month: integer("card_exp_month"),
	card_exp_year: integer("card_exp_year"),
	card_last4: text("card_last4"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	default_payment_method_id: text("default_payment_method_id"),
	identity_id: uuid("identity_id").primaryKey().notNull().references(() => identities.id, { onDelete: "cascade" } ),
	stripe_customer_id: text("stripe_customer_id").notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const tag_counts = pgTable("tag_counts", {
	tag: text("tag").primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	document_count: bigint("document_count", { mode: "number" }).default(0).notNull(),
},
(table) => {
	return {
		idx_tag_counts_count: index("idx_tag_counts_count").on(table.tag, table.document_count),
		idx_tag_counts_tag_trgm: index("idx_tag_counts_tag_trgm").on(table.tag),
	}
});

export const user_entitlements = pgTable("user_entitlements", {
	entitlement_key: text("entitlement_key").notNull(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	granted_at: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	identity_id: uuid("identity_id").notNull().references(() => identities.id, { onDelete: "cascade" } ),
	metadata: jsonb("metadata"),
	source: text("source"),
},
(table) => {
	return {
		expires_at_idx: index("user_entitlements_expires_at_idx").on(table.expires_at),
		identity_id_idx: index("user_entitlements_identity_id_idx").on(table.identity_id),
		user_entitlements_pkey: primaryKey({ columns: [table.identity_id, table.entitlement_key], name: "user_entitlements_pkey"}),
	}
});

export const user_subscriptions = pgTable("user_subscriptions", {
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	current_period_end: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	identity_id: uuid("identity_id").primaryKey().notNull().references(() => identities.id, { onDelete: "cascade" } ),
	plan: text("plan"),
	status: text("status"),
	stripe_customer_id: text("stripe_customer_id").notNull(),
	stripe_subscription_id: text("stripe_subscription_id"),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stripe_customer_id_key: uniqueIndex("user_subscriptions_stripe_customer_id_key").on(table.stripe_customer_id),
		stripe_subscription_id_key: uniqueIndex("user_subscriptions_stripe_subscription_id_key").on(table.stripe_subscription_id),
	}
});
