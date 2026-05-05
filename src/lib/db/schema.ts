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
  plusOneAllowed: boolean("plus_one_allowed").notNull().default(false),
  videoUrl: text("video_url"), // personalized video for RSVP phase

  // Address fields
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zip: varchar("zip", { length: 20 }),
  country: text("country"),

  // RSVP tracking
  rsvpSubmittedAt: timestamp("rsvp_submitted_at", { withTimezone: true }),

  // Travel checklist
  passportConfirmed: boolean("passport_confirmed").notNull().default(false),
  flightsBooked: boolean("flights_booked").notNull().default(false),
  flightDetails: text("flight_details"),
  hotelBooked: boolean("hotel_booked").notNull().default(false),
  hotelInRoomBlock: boolean("hotel_in_room_block"),
  transportNeeded: boolean("transport_needed"),
  arrivalDate: text("arrival_date"),
  departureDate: text("departure_date"),
  emergencyContact: text("emergency_contact"),
  songRequest: text("song_request"),
  messageToCouple: text("message_to_couple"),
  checklistSubmittedAt: timestamp("checklist_submitted_at", { withTimezone: true }),

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
  isPlusOne: boolean("is_plus_one").notNull().default(false),

  // RSVP per person
  rsvpStatus: varchar("rsvp_status", { length: 20 }), // 'coming' | 'not_coming' | null
  foodChoice: varchar("food_choice", { length: 64 }), // 'salmon' | 'chicken_fettuccine'
  foodAllergies: text("food_allergies"),

  // Event attendance
  attendingWelcome: boolean("attending_welcome"),
  attendingCeremony: boolean("attending_ceremony"),
  attendingReception: boolean("attending_reception"),
  attendingBrunch: boolean("attending_brunch"),

  // Per-person travel checklist
  passportConfirmed: boolean("passport_confirmed").notNull().default(false),
  flightsBooked: boolean("flights_booked").notNull().default(false),
  flightDetails: text("flight_details"),
  hotelBooked: boolean("hotel_booked").notNull().default(false),

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
// 'guest_page_phase' — 'save_the_date' | 'rsvp' | 'checklist' | 'final'
// 'show_table_numbers' — 'true' | 'false'
// 'global_video_url' — YouTube/video URL shown during RSVP phase (fallback if no per-household video)
// 'room_block_link' — URL for hotel room block booking
// 'couple_names' — e.g. "Nathan & Lauren"
// 'wedding_date' — e.g. "2027-02-26"
// 'venue_name' — e.g. "Dreams Sapphire Resort & Spa"
// 'venue_detail' — e.g. "Riviera Cancún, Mexico"

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type NewHouseholdMember = typeof householdMembers.$inferInsert;
export type Activity = typeof activityLog.$inferSelect;
export type Setting = typeof settings.$inferSelect;
