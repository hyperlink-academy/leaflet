import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  text,
  bigint,
  foreignKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";

export const aal_level = pgEnum("aal_level", ["aal1", "aal2", "aal3"]);
export const code_challenge_method = pgEnum("code_challenge_method", [
  "s256",
  "plain",
]);
export const factor_status = pgEnum("factor_status", [
  "unverified",
  "verified",
]);
export const factor_type = pgEnum("factor_type", ["totp", "webauthn"]);
export const request_status = pgEnum("request_status", [
  "PENDING",
  "SUCCESS",
  "ERROR",
]);
export const key_status = pgEnum("key_status", [
  "default",
  "valid",
  "invalid",
  "expired",
]);
export const key_type = pgEnum("key_type", [
  "aead-ietf",
  "aead-det",
  "hmacsha512",
  "hmacsha256",
  "auth",
  "shorthash",
  "generichash",
  "kdf",
  "secretbox",
  "secretstream",
  "stream_xchacha20",
]);
export const action = pgEnum("action", [
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "ERROR",
]);
export const equality_op = pgEnum("equality_op", [
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
]);

export const entities = pgTable("entities", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export const replicache_clients = pgTable("replicache_clients", {
  client_id: text("client_id").primaryKey().notNull(),
  client_group: text("client_group").notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  last_mutation: bigint("last_mutation", { mode: "number" }).notNull(),
});

export const facts = pgTable("facts", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  entity: uuid("entity")
    .notNull()
    .references(() => entities.id, {
      onDelete: "cascade",
      onUpdate: "restrict",
    }),
  attribute: text("attribute").notNull().$type<keyof typeof Attributes>(),
  data: jsonb("data").notNull().$type<Fact<any>["data"]>(),
  created_at: timestamp("created_at", { mode: "string" })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { mode: "string" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  version: bigint("version", { mode: "number" }).default(0).notNull(),
});
