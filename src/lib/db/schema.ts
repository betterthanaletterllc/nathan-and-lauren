import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: text("name").notNull(), // household display name
  partySize: integer("party_size").notNull().default(1),
  tableNumber: integer("table_number"),
  side: varchar("side", { length: 20 }), // 'bride' | 'groom' | 'both'
  note: text("note"),

  // Address fields
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zip: varchar("zip", { length: 20 }),
  country: text("country"),

  // Tracking
  linkSentAt: timestamp("link_sent_at", { withTimezone: true }),
  firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
  openCount: integer("open_count").notNull().default(0),
  addressSubmittedAt: timestamp("address_submitted_at", { withTimezone: true }),
  calendarSavedAt: timestamp("calendar_saved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => guests.id, { onDelete: "cascade" }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  dietaryRestrictions: text("dietary_restrictions"),
  isChild: boolean("is_child").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").references(() => guests.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 64 }).notNull(), // 'opened' | 'address_submitted' | 'calendar_saved' | 'guest_added' | 'guest_imported' | 'reminder_sent'
  metadata: jsonb("metadata"), // extra context
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Settings keys:
// 'global_note' — default note shown on all guest pages
// 'reminder_threshold_days' — days before flagging a guest as needing a nudge
// 'couple_names' — e.g. "Nathan & Lauren"
// 'wedding_date' — e.g. "2027-02-26"
// 'venue_name' — e.g. "Cancún, Mexico"
// 'venue_detail' — e.g. "All-inclusive resort · details to follow"
// 'website_url' — e.g. "nathanandlauren.com"

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type NewHouseholdMember = typeof householdMembers.$inferInsert;
export type Activity = typeof activityLog.$inferSelect;
export type Setting = typeof settings.$inferSelect;
