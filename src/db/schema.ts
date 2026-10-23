import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

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

  // Fit & Breathability (definisi: scripts/lib/classify-fit.ts)
  sizing: text("sizing").notNull().default("unknown"), // true_to_size | narrow | wide | runs_small | runs_large | unknown
  lengthFit: text("length_fit").notNull().default("unknown"),
  widthFit: text("width_fit").notNull().default("unknown"),
  fitVotes: integer("fit_votes"),
  breathability: text("breathability").notNull().default("unknown"), // cool | moderate | warm | unknown
  upperMaterial: text("upper_material"),

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

/**
 * Foto referensi per sepatu (untuk pengenalan visual on-device). Satu sepatu → banyak foto.
 * kind: product (sepatu utuh) | detail (bagian) | lab (frame/gambar uji). usable = layak di-embed.
 */
export const shoeImages = sqliteTable(
  "shoe_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shoeId: text("shoe_id")
      .notNull()
      .references(() => shoes.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    kind: text("kind").notNull().default("product"),
    label: text("label").notNull().default(""),
    usable: integer("usable", { mode: "boolean" }).notNull().default(true),
    source: text("source").notNull().default("runrepeat"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => ({
    shoeUrlUnique: uniqueIndex("shoe_images_shoe_url_uq").on(t.shoeId, t.url),
    shoeIdx: index("shoe_images_shoe_idx").on(t.shoeId),
  })
);

export type ShoeImageRecord = typeof shoeImages.$inferSelect;
export type NewShoeImageRecord = typeof shoeImages.$inferInsert;
