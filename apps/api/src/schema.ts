// server/src/schema.ts
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  json,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * NOTE:
 * - This schema uses `gen_random_uuid()` for default UUID generation.
 * - Make sure to enable the pgcrypto extension in your DB before running migrations:
 *   CREATE EXTENSION IF NOT EXISTS pgcrypto;
 */

/**
 * Admin (single admin role)
 */
export const admins = pgTable("admins", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  full_name: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  // store password hash if you want admin login; optional if you use external auth
  password_hash: text("password_hash"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Elections
 */
export const elections = pgTable("elections", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  starts_at: timestamp("starts_at"),
  ends_at: timestamp("ends_at"),
  // draft | open | paused | closed | archived
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  created_by: uuid("created_by").references(() => admins.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  // JSON config (e.g., requireCompleteRanking: true)
  config: json("config"),
});

/**
 * Positions - single-seat only (seats = 1, always)
 * This backend does NOT support multi-seat elections.
 */
export const positions = pgTable("positions", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  election_id: uuid("election_id").references(() => elections.id).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  // single-seat: keep default 1 to be explicit
  seats: integer("seats").notNull().default(1),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Candidates
 */
export const candidates = pgTable("candidates", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  election_id: uuid("election_id").references(() => elections.id).notNull(),
  position_id: uuid("position_id").references(() => positions.id).notNull(),
  display_name: varchar("display_name", { length: 200 }).notNull(),
  manifesto_link: text("manifesto_link"), // stores URL or path
  nominated_at: timestamp("nominated_at").defaultNow().notNull(),
  withdrawn: boolean("withdrawn").notNull().default(false),
});

/**
 * VOTERS (CSV import, stores hashed token; used to verify a token and mark it used)
 *
 * Note: we DO NOT link voters to ballots to keep ballots anonymous.
 */
export const voters = pgTable("voters", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  election_id: uuid("election_id").references(() => elections.id).notNull(),
  full_name: varchar("full_name", { length: 200 }),
  student_id: varchar("student_id", { length: 100 }),
  email: varchar("email", { length: 320 }),
  // hashed token (bcrypt or similar). Never store plaintext tokens.
  token_hash: text("token_hash").notNull(),
  // SHA256(token) hex for fast lookup
  token_fingerprint: varchar("token_fingerprint", { length: 64 }),
  // Store real token for admin display (encrypted or plaintext based on security requirements)
  real_token: text("real_token").notNull(),
  // Store the prefilled voting URL for easy access and distribution
  prefilled_url: text("prefilled_url"),
  token_used_at: timestamp("token_used_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/**
 * BALLOTS (anonymous) — NOT linked to voters!
 * A ballot represents a single completed submission (one per token).
 */
export const ballots = pgTable("ballots", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  election_id: uuid("election_id").references(() => elections.id).notNull(),
  submitted_at: timestamp("submitted_at").defaultNow().notNull(),
  meta: json("meta"),
});

/**
 * BALLOT_RANKINGS
 */
export const ballot_rankings = pgTable("ballot_rankings", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  ballot_id: uuid("ballot_id").references(() => ballots.id).notNull(),
  position_id: uuid("position_id").references(() => positions.id).notNull(),
  candidate_id: uuid("candidate_id").references(() => candidates.id).notNull(),
  rank: integer("rank").notNull(), // 1 = first preference, 2 = second, ...
});

/**
 * STV COUNT JOBS
 */
export const count_jobs = pgTable("count_jobs", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  election_id: uuid("election_id").references(() => elections.id).notNull(),
  position_id: uuid("position_id").references(() => positions.id).notNull(),
  started_by: uuid("started_by").references(() => admins.id),
  method: varchar("method", { length: 50 }).notNull().default("STV"),
  seed: text("seed"),
  started_at: timestamp("started_at").defaultNow().notNull(),
  finished_at: timestamp("finished_at"),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  result_summary: json("result_summary"),
});

/**
 * STV COUNT EVENTS
 */
export const count_events = pgTable("count_events", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  job_id: uuid("job_id").references(() => count_jobs.id).notNull(),
  round_number: integer("round_number").notNull(),
  payload: json("payload").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
