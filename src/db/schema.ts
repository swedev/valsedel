import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const valtypEnum = pgEnum("valtyp", [
  "riksdag",
  "region",
  "kommun",
  "eu",
]);

export const regionTypEnum = pgEnum("region_typ", ["lan", "kommun", "valkrets"]);

export const parties = pgTable("parties", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  kod: text("kod").notNull().unique(),
  beteckning: text("beteckning").notNull(),
  forkortning: text("forkortning"),
  registreringsdatum: timestamp("registreringsdatum"),
  logoUrl: text("logo_url"),
});

export const regions = pgTable("regions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  kod: text("kod").notNull().unique(),
  namn: text("namn").notNull(),
  typ: regionTypEnum("typ").notNull(),
  parentId: text("parent_id"),
});

export const candidates = pgTable("candidates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  namn: text("namn").notNull(),
  alder: integer("alder"),
  hemvist: text("hemvist"),
  yrke: text("yrke"),
  listNr: integer("list_nr").notNull(),
  partyId: text("party_id")
    .notNull()
    .references(() => parties.id),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id),
  valtyp: valtypEnum("valtyp").notNull(),
  valAr: integer("val_ar").notNull(),
});

export const electionParticipations = pgTable(
  "election_participations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partyId: text("party_id")
      .notNull()
      .references(() => parties.id),
    valtyp: valtypEnum("valtyp").notNull(),
    valAr: integer("val_ar").notNull(),
    regionKod: text("region_kod"),
  },
  (table) => [
    unique("election_participation_unique").on(
      table.partyId,
      table.valtyp,
      table.valAr,
      table.regionKod
    ),
  ]
);

export const ballots = pgTable("ballots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  shortId: text("short_id").notNull().unique(),
  valtyp: valtypEnum("valtyp").notNull(),
  regionKod: text("region_kod"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ballotChoices = pgTable("ballot_choices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  rank: integer("rank").notNull(),
  ballotId: text("ballot_id")
    .notNull()
    .references(() => ballots.id),
  partyId: text("party_id")
    .notNull()
    .references(() => parties.id),
  kandidatNr: integer("kandidat_nr"),
  kandidatNamn: text("kandidat_namn"),
});

// Type exports
export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type Ballot = typeof ballots.$inferSelect;
export type BallotChoice = typeof ballotChoices.$inferSelect;
export type Valtyp = (typeof valtypEnum.enumValues)[number];
export type RegionTyp = (typeof regionTypEnum.enumValues)[number];
