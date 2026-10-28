import { relations } from "drizzle-orm/relations";
import { atp_poll_records, atp_poll_votes, bsky_follows, bsky_posts, bsky_profiles, comment_tombstones, comments_on_documents, custom_domain_routes, custom_domains, document_mentions_in_bsky, document_question_answers, document_question_visibility, document_questions, document_replies, document_reply_rejections, document_reply_visibility, document_tags, document_version_blob_refs, document_versions, documents, documents_in_publications, email_auth_tokens, email_subscriptions_to_entity, entities, entity_sets, facts, identities, leaflet_contributors, leaflets_in_publications, leaflets_to_documents, notifications, permission_token_on_homepage, permission_token_rights, permission_tokens, phone_rsvps_to_entity, poll_votes_on_entity, publication_contributors, publication_domains, publication_email_posts, publication_email_subscriber_events, publication_email_subscribers, publication_membership_settings, publication_membership_tiers, publication_memberships, publication_newsletter_settings, publication_pages, publication_post_sends, publication_recommendations, publication_scheduled_posts, publication_subscriptions, publications, recommends_on_documents, reply_drafts, site_standard_documents, site_standard_documents_in_publications, site_standard_publications, site_standard_subscriptions, stripe_connected_accounts, stripe_connected_customers, stripe_wallets, user_entitlements, user_subscriptions } from "./schema";

export const atp_poll_recordsRelations = relations(atp_poll_records, ({many}) => ({
	atp_poll_votes: many(atp_poll_votes),
}));

export const atp_poll_votesRelations = relations(atp_poll_votes, ({one}) => ({
	atp_poll_record: one(atp_poll_records, {
		fields: [atp_poll_votes.poll_uri],
		references: [atp_poll_records.uri],
	}),
}));

export const bsky_followsRelations = relations(bsky_follows, ({one}) => ({
	identity_follows: one(identities, {
		fields: [bsky_follows.follows],
		references: [identities.atp_did],
		relationName: "bsky_follows_follows_identities_atp_did",
	}),
	identity_identity: one(identities, {
		fields: [bsky_follows.identity],
		references: [identities.atp_did],
		relationName: "bsky_follows_identity_identities_atp_did",
	}),
}));

export const bsky_postsRelations = relations(bsky_posts, ({many}) => ({
	document_mentions_in_bskies: many(document_mentions_in_bsky),
}));

export const bsky_profilesRelations = relations(bsky_profiles, ({one}) => ({
	identity: one(identities, {
		fields: [bsky_profiles.did],
		references: [identities.atp_did],
	}),
}));

export const comment_tombstonesRelations = relations(comment_tombstones, ({one}) => ({
	document: one(documents, {
		fields: [comment_tombstones.document],
		references: [documents.uri],
	}),
}));

export const comments_on_documentsRelations = relations(comments_on_documents, ({one}) => ({
	document: one(documents, {
		fields: [comments_on_documents.document],
		references: [documents.uri],
	}),
}));

export const custom_domain_routesRelations = relations(custom_domain_routes, ({one}) => ({
	custom_domain: one(custom_domains, {
		fields: [custom_domain_routes.domain],
		references: [custom_domains.domain],
	}),
	permission_token_edit_permission_token: one(permission_tokens, {
		fields: [custom_domain_routes.edit_permission_token],
		references: [permission_tokens.id],
		relationName: "custom_domain_routes_edit_permission_token_permission_tokens_id",
	}),
	permission_token_view_permission_token: one(permission_tokens, {
		fields: [custom_domain_routes.view_permission_token],
		references: [permission_tokens.id],
		relationName: "custom_domain_routes_view_permission_token_permission_tokens_id",
	}),
}));

export const custom_domainsRelations = relations(custom_domains, ({one, many}) => ({
	custom_domain_routes: many(custom_domain_routes),
	identity_identity: one(identities, {
		fields: [custom_domains.identity],
		references: [identities.email],
		relationName: "custom_domains_identity_identities_email",
	}),
	identity_identity_id: one(identities, {
		fields: [custom_domains.identity_id],
		references: [identities.id],
		relationName: "custom_domains_identity_id_identities_id",
	}),
	publication_domains: many(publication_domains),
}));

export const document_mentions_in_bskyRelations = relations(document_mentions_in_bsky, ({one}) => ({
	bsky_post: one(bsky_posts, {
		fields: [document_mentions_in_bsky.uri],
		references: [bsky_posts.uri],
	}),
	document: one(documents, {
		fields: [document_mentions_in_bsky.document],
		references: [documents.uri],
	}),
}));

export const document_question_answersRelations = relations(document_question_answers, ({one}) => ({
	document: one(documents, {
		fields: [document_question_answers.subject],
		references: [documents.uri],
	}),
	document_question: one(document_questions, {
		fields: [document_question_answers.question],
		references: [document_questions.uri],
	}),
}));

export const document_question_visibilityRelations = relations(document_question_visibility, ({one}) => ({
	document: one(documents, {
		fields: [document_question_visibility.subject],
		references: [documents.uri],
	}),
}));

export const document_questionsRelations = relations(document_questions, ({one, many}) => ({
	document: one(documents, {
		fields: [document_questions.subject],
		references: [documents.uri],
	}),
	document_question_answers: many(document_question_answers),
}));

export const document_repliesRelations = relations(document_replies, ({one, many}) => ({
	document_document: one(documents, {
		fields: [document_replies.document],
		references: [documents.uri],
		relationName: "document_replies_document_documents_uri",
	}),
	document_reply_rejections: many(document_reply_rejections),
	document_subject: one(documents, {
		fields: [document_replies.subject],
		references: [documents.uri],
		relationName: "document_replies_subject_documents_uri",
	}),
}));

export const document_reply_rejectionsRelations = relations(document_reply_rejections, ({one}) => ({
	document: one(documents, {
		fields: [document_reply_rejections.subject],
		references: [documents.uri],
	}),
	document_reply: one(document_replies, {
		fields: [document_reply_rejections.reply],
		references: [document_replies.uri],
	}),
}));

export const document_reply_visibilityRelations = relations(document_reply_visibility, ({one}) => ({
	document: one(documents, {
		fields: [document_reply_visibility.subject],
		references: [documents.uri],
	}),
}));

export const document_tagsRelations = relations(document_tags, ({one}) => ({
	document: one(documents, {
		fields: [document_tags.uri],
		references: [documents.uri],
	}),
}));

export const document_version_blob_refsRelations = relations(document_version_blob_refs, ({one}) => ({
	document_version: one(document_versions, {
		fields: [document_version_blob_refs.version],
		references: [document_versions.id],
	}),
}));

export const document_versionsRelations = relations(document_versions, ({one, many}) => ({
	document_version_blob_refs: many(document_version_blob_refs),
	identity: one(identities, {
		fields: [document_versions.author_identity],
		references: [identities.id],
	}),
	permission_token: one(permission_tokens, {
		fields: [document_versions.token],
		references: [permission_tokens.id],
	}),
}));

export const documentsRelations = relations(documents, ({many}) => ({
	comment_tombstones: many(comment_tombstones),
	comments_on_documents: many(comments_on_documents),
	document_mentions_in_bskies: many(document_mentions_in_bsky),
	document_question_answers: many(document_question_answers),
	document_question_visibilities: many(document_question_visibility),
	document_questions: many(document_questions),
	document_replies_document: many(document_replies, {
		relationName: "document_replies_document_documents_uri",
	}),
	document_replies_subject: many(document_replies, {
		relationName: "document_replies_subject_documents_uri",
	}),
	document_reply_rejections: many(document_reply_rejections),
	document_reply_visibilities: many(document_reply_visibility),
	document_tags: many(document_tags),
	documents_in_publications: many(documents_in_publications),
	leaflets_in_publications: many(leaflets_in_publications),
	leaflets_to_documents: many(leaflets_to_documents),
	publication_pages: many(publication_pages),
	publication_post_sends: many(publication_post_sends),
	recommends_on_documents: many(recommends_on_documents),
	reply_drafts: many(reply_drafts),
}));

export const documents_in_publicationsRelations = relations(documents_in_publications, ({one}) => ({
	document: one(documents, {
		fields: [documents_in_publications.document],
		references: [documents.uri],
	}),
	publication: one(publications, {
		fields: [documents_in_publications.publication],
		references: [publications.uri],
	}),
}));

export const email_auth_tokensRelations = relations(email_auth_tokens, ({one}) => ({
	identity: one(identities, {
		fields: [email_auth_tokens.identity],
		references: [identities.id],
	}),
}));

export const email_subscriptions_to_entityRelations = relations(email_subscriptions_to_entity, ({one}) => ({
	entity: one(entities, {
		fields: [email_subscriptions_to_entity.entity],
		references: [entities.id],
	}),
	permission_token: one(permission_tokens, {
		fields: [email_subscriptions_to_entity.token],
		references: [permission_tokens.id],
	}),
}));

export const entitiesRelations = relations(entities, ({one, many}) => ({
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	entity_set: one(entity_sets, {
		fields: [entities.set],
		references: [entity_sets.id],
	}),
	facts: many(facts),
	permission_tokens: many(permission_tokens),
	phone_rsvps_to_entities: many(phone_rsvps_to_entity),
	poll_votes_on_entities_option_entity: many(poll_votes_on_entity, {
		relationName: "poll_votes_on_entity_option_entity_entities_id",
	}),
	poll_votes_on_entities_poll_entity: many(poll_votes_on_entity, {
		relationName: "poll_votes_on_entity_poll_entity_entities_id",
	}),
}));

export const entity_setsRelations = relations(entity_sets, ({many}) => ({
	entities: many(entities),
	permission_token_rights: many(permission_token_rights),
}));

export const factsRelations = relations(facts, ({one}) => ({
	entity: one(entities, {
		fields: [facts.entity],
		references: [entities.id],
	}),
}));

export const identitiesRelations = relations(identities, ({one, many}) => ({
	bsky_follows_follows: many(bsky_follows, {
		relationName: "bsky_follows_follows_identities_atp_did",
	}),
	bsky_follows_identity: many(bsky_follows, {
		relationName: "bsky_follows_identity_identities_atp_did",
	}),
	bsky_profiles: many(bsky_profiles),
	custom_domains_identity: many(custom_domains, {
		relationName: "custom_domains_identity_identities_email",
	}),
	custom_domains_identity_id: many(custom_domains, {
		relationName: "custom_domains_identity_id_identities_id",
	}),
	document_versions: many(document_versions),
	email_auth_tokens: many(email_auth_tokens),
	leaflet_contributors: many(leaflet_contributors),
	notifications: many(notifications),
	permission_token: one(permission_tokens, {
		fields: [identities.home_page],
		references: [permission_tokens.id],
	}),
	permission_token_on_homepages: many(permission_token_on_homepage),
	publication_contributors: many(publication_contributors),
	publication_domains: many(publication_domains),
	publication_email_subscribers: many(publication_email_subscribers),
	publication_memberships: many(publication_memberships),
	publication_subscriptions: many(publication_subscriptions),
	publications: many(publications),
	recommends_on_documents: many(recommends_on_documents),
	reply_drafts: many(reply_drafts),
	site_standard_documents: many(site_standard_documents),
	site_standard_publications: many(site_standard_publications),
	site_standard_subscriptions: many(site_standard_subscriptions),
	stripe_connected_accounts: many(stripe_connected_accounts),
	stripe_connected_customers: many(stripe_connected_customers),
	stripe_wallets: many(stripe_wallets),
	user_entitlements: many(user_entitlements),
	user_subscriptions: many(user_subscriptions),
}));

export const leaflet_contributorsRelations = relations(leaflet_contributors, ({one}) => ({
	identity: one(identities, {
		fields: [leaflet_contributors.contributor_did],
		references: [identities.atp_did],
	}),
	permission_token: one(permission_tokens, {
		fields: [leaflet_contributors.leaflet],
		references: [permission_tokens.id],
	}),
}));

export const leaflets_in_publicationsRelations = relations(leaflets_in_publications, ({one}) => ({
	document: one(documents, {
		fields: [leaflets_in_publications.doc],
		references: [documents.uri],
	}),
	permission_token: one(permission_tokens, {
		fields: [leaflets_in_publications.leaflet],
		references: [permission_tokens.id],
	}),
	publication: one(publications, {
		fields: [leaflets_in_publications.publication],
		references: [publications.uri],
	}),
}));

export const leaflets_to_documentsRelations = relations(leaflets_to_documents, ({one}) => ({
	document: one(documents, {
		fields: [leaflets_to_documents.document],
		references: [documents.uri],
	}),
	permission_token: one(permission_tokens, {
		fields: [leaflets_to_documents.leaflet],
		references: [permission_tokens.id],
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	identity: one(identities, {
		fields: [notifications.recipient],
		references: [identities.atp_did],
	}),
}));

export const permission_token_on_homepageRelations = relations(permission_token_on_homepage, ({one}) => ({
	identity: one(identities, {
		fields: [permission_token_on_homepage.identity],
		references: [identities.id],
	}),
	permission_token: one(permission_tokens, {
		fields: [permission_token_on_homepage.token],
		references: [permission_tokens.id],
	}),
}));

export const permission_token_rightsRelations = relations(permission_token_rights, ({one}) => ({
	entity_set: one(entity_sets, {
		fields: [permission_token_rights.entity_set],
		references: [entity_sets.id],
	}),
	permission_token: one(permission_tokens, {
		fields: [permission_token_rights.token],
		references: [permission_tokens.id],
	}),
}));

export const permission_tokensRelations = relations(permission_tokens, ({one, many}) => ({
	custom_domain_routes_edit_permission_token: many(custom_domain_routes, {
		relationName: "custom_domain_routes_edit_permission_token_permission_tokens_id",
	}),
	custom_domain_routes_view_permission_token: many(custom_domain_routes, {
		relationName: "custom_domain_routes_view_permission_token_permission_tokens_id",
	}),
	document_versions: many(document_versions),
	email_subscriptions_to_entities: many(email_subscriptions_to_entity),
	entity: one(entities, {
		fields: [permission_tokens.root_entity],
		references: [entities.id],
	}),
	identities: many(identities),
	leaflet_contributors: many(leaflet_contributors),
	leaflets_in_publications: many(leaflets_in_publications),
	leaflets_to_documents: many(leaflets_to_documents),
	permission_token_on_homepages: many(permission_token_on_homepage),
	permission_token_rights: many(permission_token_rights),
	publication_email_posts: many(publication_email_posts),
	publication_pages: many(publication_pages),
	publication_scheduled_posts: many(publication_scheduled_posts),
	publications: many(publications),
	reply_drafts: many(reply_drafts),
}));

export const phone_rsvps_to_entityRelations = relations(phone_rsvps_to_entity, ({one}) => ({
	entity: one(entities, {
		fields: [phone_rsvps_to_entity.entity],
		references: [entities.id],
	}),
}));

export const poll_votes_on_entityRelations = relations(poll_votes_on_entity, ({one}) => ({
	entity_option_entity: one(entities, {
		fields: [poll_votes_on_entity.option_entity],
		references: [entities.id],
		relationName: "poll_votes_on_entity_option_entity_entities_id",
	}),
	entity_poll_entity: one(entities, {
		fields: [poll_votes_on_entity.poll_entity],
		references: [entities.id],
		relationName: "poll_votes_on_entity_poll_entity_entities_id",
	}),
}));

export const publication_contributorsRelations = relations(publication_contributors, ({one}) => ({
	identity: one(identities, {
		fields: [publication_contributors.contributor_did],
		references: [identities.atp_did],
	}),
	publication: one(publications, {
		fields: [publication_contributors.publication_uri],
		references: [publications.uri],
	}),
}));

export const publication_domainsRelations = relations(publication_domains, ({one}) => ({
	custom_domain: one(custom_domains, {
		fields: [publication_domains.domain],
		references: [custom_domains.domain],
	}),
	identity: one(identities, {
		fields: [publication_domains.identity],
		references: [identities.atp_did],
	}),
	publication: one(publications, {
		fields: [publication_domains.publication],
		references: [publications.uri],
	}),
}));

export const publication_email_postsRelations = relations(publication_email_posts, ({one}) => ({
	permission_token: one(permission_tokens, {
		fields: [publication_email_posts.leaflet],
		references: [permission_tokens.id],
	}),
	publication: one(publications, {
		fields: [publication_email_posts.publication],
		references: [publications.uri],
	}),
}));

export const publication_email_subscriber_eventsRelations = relations(publication_email_subscriber_events, ({one}) => ({
	publication: one(publications, {
		fields: [publication_email_subscriber_events.publication],
		references: [publications.uri],
	}),
	publication_email_subscriber: one(publication_email_subscribers, {
		fields: [publication_email_subscriber_events.subscriber],
		references: [publication_email_subscribers.id],
	}),
}));

export const publication_email_subscribersRelations = relations(publication_email_subscribers, ({one, many}) => ({
	identity: one(identities, {
		fields: [publication_email_subscribers.identity_id],
		references: [identities.id],
	}),
	publication: one(publications, {
		fields: [publication_email_subscribers.publication],
		references: [publications.uri],
	}),
	publication_email_subscriber_events: many(publication_email_subscriber_events),
}));

export const publication_membership_settingsRelations = relations(publication_membership_settings, ({one}) => ({
	publication: one(publications, {
		fields: [publication_membership_settings.publication],
		references: [publications.uri],
	}),
}));

export const publication_membership_tiersRelations = relations(publication_membership_tiers, ({one, many}) => ({
	publication: one(publications, {
		fields: [publication_membership_tiers.publication],
		references: [publications.uri],
	}),
	publication_memberships_pending_tier: many(publication_memberships, {
		relationName: "publication_memberships_pending_tier_publication_membership_tiers_id",
	}),
	publication_memberships_tier: many(publication_memberships, {
		relationName: "publication_memberships_tier_publication_membership_tiers_id",
	}),
}));

export const publication_membershipsRelations = relations(publication_memberships, ({one}) => ({
	identity: one(identities, {
		fields: [publication_memberships.identity_id],
		references: [identities.id],
	}),
	publication: one(publications, {
		fields: [publication_memberships.publication],
		references: [publications.uri],
	}),
	publication_membership_tier_pending_tier: one(publication_membership_tiers, {
		fields: [publication_memberships.pending_tier],
		references: [publication_membership_tiers.id],
		relationName: "publication_memberships_pending_tier_publication_membership_tiers_id",
	}),
	publication_membership_tier_tier: one(publication_membership_tiers, {
		fields: [publication_memberships.tier],
		references: [publication_membership_tiers.id],
		relationName: "publication_memberships_tier_publication_membership_tiers_id",
	}),
}));

export const publication_newsletter_settingsRelations = relations(publication_newsletter_settings, ({one}) => ({
	publication: one(publications, {
		fields: [publication_newsletter_settings.publication],
		references: [publications.uri],
	}),
}));

export const publication_pagesRelations = relations(publication_pages, ({one}) => ({
	document: one(documents, {
		fields: [publication_pages.document],
		references: [documents.uri],
	}),
	permission_token: one(permission_tokens, {
		fields: [publication_pages.leaflet_src],
		references: [permission_tokens.id],
	}),
	publication: one(publications, {
		fields: [publication_pages.publication],
		references: [publications.uri],
	}),
}));

export const publication_post_sendsRelations = relations(publication_post_sends, ({one}) => ({
	document: one(documents, {
		fields: [publication_post_sends.document],
		references: [documents.uri],
	}),
	publication: one(publications, {
		fields: [publication_post_sends.publication],
		references: [publications.uri],
	}),
}));

export const publication_recommendationsRelations = relations(publication_recommendations, ({one}) => ({
	publication: one(publications, {
		fields: [publication_recommendations.publication],
		references: [publications.uri],
	}),
}));

export const publication_scheduled_postsRelations = relations(publication_scheduled_posts, ({one}) => ({
	permission_token: one(permission_tokens, {
		fields: [publication_scheduled_posts.leaflet],
		references: [permission_tokens.id],
	}),
	publication: one(publications, {
		fields: [publication_scheduled_posts.publication],
		references: [publications.uri],
	}),
}));

export const publication_subscriptionsRelations = relations(publication_subscriptions, ({one}) => ({
	identity: one(identities, {
		fields: [publication_subscriptions.identity],
		references: [identities.atp_did],
	}),
	publication: one(publications, {
		fields: [publication_subscriptions.publication],
		references: [publications.uri],
	}),
}));

export const publicationsRelations = relations(publications, ({one, many}) => ({
	documents_in_publications: many(documents_in_publications),
	identity: one(identities, {
		fields: [publications.identity_did],
		references: [identities.atp_did],
	}),
	leaflets_in_publications: many(leaflets_in_publications),
	permission_token: one(permission_tokens, {
		fields: [publications.draft_leaflet],
		references: [permission_tokens.id],
	}),
	publication_contributors: many(publication_contributors),
	publication_domains: many(publication_domains),
	publication_email_posts: many(publication_email_posts),
	publication_email_subscriber_events: many(publication_email_subscriber_events),
	publication_email_subscribers: many(publication_email_subscribers),
	publication_membership_settings: many(publication_membership_settings),
	publication_membership_tiers: many(publication_membership_tiers),
	publication_memberships: many(publication_memberships),
	publication_newsletter_settings: many(publication_newsletter_settings),
	publication_pages: many(publication_pages),
	publication_post_sends: many(publication_post_sends),
	publication_recommendations: many(publication_recommendations),
	publication_scheduled_posts: many(publication_scheduled_posts),
	publication_subscriptions: many(publication_subscriptions),
}));

export const recommends_on_documentsRelations = relations(recommends_on_documents, ({one}) => ({
	document: one(documents, {
		fields: [recommends_on_documents.document],
		references: [documents.uri],
	}),
	identity: one(identities, {
		fields: [recommends_on_documents.recommender_did],
		references: [identities.atp_did],
	}),
}));

export const reply_draftsRelations = relations(reply_drafts, ({one}) => ({
	document: one(documents, {
		fields: [reply_drafts.subject],
		references: [documents.uri],
	}),
	identity: one(identities, {
		fields: [reply_drafts.identity_did],
		references: [identities.atp_did],
	}),
	permission_token: one(permission_tokens, {
		fields: [reply_drafts.leaflet],
		references: [permission_tokens.id],
	}),
}));

export const site_standard_documentsRelations = relations(site_standard_documents, ({one, many}) => ({
	identity: one(identities, {
		fields: [site_standard_documents.identity_did],
		references: [identities.atp_did],
	}),
	site_standard_documents_in_publications: many(site_standard_documents_in_publications),
}));

export const site_standard_documents_in_publicationsRelations = relations(site_standard_documents_in_publications, ({one}) => ({
	site_standard_document: one(site_standard_documents, {
		fields: [site_standard_documents_in_publications.document],
		references: [site_standard_documents.uri],
	}),
	site_standard_publication: one(site_standard_publications, {
		fields: [site_standard_documents_in_publications.publication],
		references: [site_standard_publications.uri],
	}),
}));

export const site_standard_publicationsRelations = relations(site_standard_publications, ({one, many}) => ({
	identity: one(identities, {
		fields: [site_standard_publications.identity_did],
		references: [identities.atp_did],
	}),
	site_standard_documents_in_publications: many(site_standard_documents_in_publications),
	site_standard_subscriptions: many(site_standard_subscriptions),
}));

export const site_standard_subscriptionsRelations = relations(site_standard_subscriptions, ({one}) => ({
	identity: one(identities, {
		fields: [site_standard_subscriptions.identity],
		references: [identities.atp_did],
	}),
	site_standard_publication: one(site_standard_publications, {
		fields: [site_standard_subscriptions.publication],
		references: [site_standard_publications.uri],
	}),
}));

export const stripe_connected_accountsRelations = relations(stripe_connected_accounts, ({one}) => ({
	identity: one(identities, {
		fields: [stripe_connected_accounts.identity_id],
		references: [identities.id],
	}),
}));

export const stripe_connected_customersRelations = relations(stripe_connected_customers, ({one}) => ({
	identity: one(identities, {
		fields: [stripe_connected_customers.identity_id],
		references: [identities.id],
	}),
}));

export const stripe_walletsRelations = relations(stripe_wallets, ({one}) => ({
	identity: one(identities, {
		fields: [stripe_wallets.identity_id],
		references: [identities.id],
	}),
}));

export const user_entitlementsRelations = relations(user_entitlements, ({one}) => ({
	identity: one(identities, {
		fields: [user_entitlements.identity_id],
		references: [identities.id],
	}),
}));

export const user_subscriptionsRelations = relations(user_subscriptions, ({one}) => ({
	identity: one(identities, {
		fields: [user_subscriptions.identity_id],
		references: [identities.id],
	}),
}));
