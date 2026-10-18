import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const shoes = sqliteTable("shoes", {
  id: text("id").primaryKey(), // slug: "asics-novablast-4"
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  releaseYear: integer("release_year").notNull(),
  category: text("category").notNull(), // standard category slug
  subCategory: text("sub_category"),
  terrain: text("terrain"),
  primaryUse: text("primary_use").notNull(),
  secondaryUse: text("secondary_use"),
  targetPaceRange: text("target_pace_range").notNull(), // "5:00 - 6:30 min/km"
  runnerType: text("runner_type").notNull().default("Neutral"),
  surface: text("surface").notNull().default("Road"),

  // Lab Measurements (RunRepeat)
  weightGrams: real("weight_grams").notNull(),
  dropMm: real("drop_mm").notNull(),
  heelStackMm: real("heel_stack_mm").notNull(),
  forefootStackMm: real("forefoot_stack_mm").notNull(),
  foamType: text("foam_type").notNull(),
  plateType: text("plate_type").notNull().default("None"),
  cushionFeel: text("cushion_feel").notNull().default("Balanced"),

  // Review & Verdict
  verdictSummary: text("verdict_summary").notNull(),
  pros: text("pros").notNull(), // JSON string: ["bouncy", "comfortable"]
  cons: text("cons").notNull(), // JSON string: ["loose heel"]
  imageUrl: text("image_url"),
  sourceUrl: text("source_url").notNull(),

  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type ShoeRecord = typeof shoes.$inferSelect;
export type NewShoeRecord = typeof shoes.$inferInsert;
