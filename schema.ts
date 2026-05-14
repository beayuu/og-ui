import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const corals = pgTable("corals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  image: text("image").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  stock: integer("stock").notNull(),
});

export const insertCoralSchema = createInsertSchema(corals)
  .omit({ id: true })
  .extend({
    name: z.string().trim().min(1, "Name is required"),
    image: z.string().trim().min(1, "Image URL is required"),
    description: z.string().trim().default(""),
    price: z.coerce.number().int().positive("Price must be positive"),
    stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  });

export const updateCoralSchema = insertCoralSchema.partial();

export type InsertCoral = z.infer<typeof insertCoralSchema>;
export type UpdateCoral = z.infer<typeof updateCoralSchema>;
export type Coral = typeof corals.$inferSelect;

export const adoptions = pgTable("adoptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  coralId: varchar("coral_id"),
  coralName: text("coral_name").notNull(),
  coralImage: text("coral_image").notNull(),
  amount: integer("amount").notNull(),
  price: integer("price").notNull(),
  adoptedAt: timestamp("adopted_at").notNull().defaultNow(),
});

export const insertAdoptionSchema = createInsertSchema(adoptions).omit({
  id: true,
  userId: true,
  adoptedAt: true,
});

export const adoptionRequestSchema = z.object({
  coralId: z.string().min(1, "Pick a coral"),
  amount: z.coerce.number().int().positive("Amount must be positive"),
});

export type InsertAdoption = z.infer<typeof insertAdoptionSchema>;
export type AdoptionRequest = z.infer<typeof adoptionRequestSchema>;
export type Adoption = typeof adoptions.$inferSelect;

export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  donorName: text("donor_name"),
  donorEmail: text("donor_email"),
  donatedAt: timestamp("donated_at").notNull().defaultNow(),
});

export const insertDonationSchema = createInsertSchema(donations)
  .omit({ id: true, userId: true, donatedAt: true })
  .extend({
    amount: z.coerce
      .number()
      .int()
      .min(1, "Minimum donation is $1")
      .max(100000, "Maximum donation is $100,000"),
    donorName: z.string().trim().optional(),
    donorEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  });

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

export const VOLUNTEER_STATUSES = ["open", "closed", "completed", "ongoing", "cancelled"] as const;
export type VolunteerStatus = (typeof VOLUNTEER_STATUSES)[number];

export const VOLUNTEER_CATEGORIES = ["cleanup", "replanting", "survey", "outreach", "other"] as const;
export type VolunteerCategory = (typeof VOLUNTEER_CATEGORIES)[number];

export const volunteerWorks = pgTable("volunteer_works", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  endDate: timestamp("end_date"),
  hours: integer("hours").notNull(),
  status: text("status").notNull().default("open"),
  category: text("category").notNull().default("other"),
  maxVolunteers: integer("max_volunteers"),
});

export const insertVolunteerWorkSchema = createInsertSchema(volunteerWorks)
  .omit({ id: true })
  .extend({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().min(1, "Description is required"),
    location: z.string().trim().min(1, "Location is required"),
    hours: z.coerce.number().int().positive("Hours must be positive"),
    scheduledFor: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    status: z.enum(VOLUNTEER_STATUSES).default("open"),
    category: z.enum(VOLUNTEER_CATEGORIES).default("other"),
    maxVolunteers: z.coerce.number().int().positive().optional().nullable(),
  });

export const updateVolunteerWorkSchema = insertVolunteerWorkSchema.partial();

export type InsertVolunteerWork = z.infer<typeof insertVolunteerWorkSchema>;
export type UpdateVolunteerWork = z.infer<typeof updateVolunteerWorkSchema>;
export type VolunteerWork = typeof volunteerWorks.$inferSelect;

export const volunteerSignups = pgTable("volunteer_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  workId: varchar("work_id").notNull(),
  signedUpAt: timestamp("signed_up_at").notNull().defaultNow(),
});

export type VolunteerSignup = typeof volunteerSignups.$inferSelect;

export const EXPENSE_CATEGORIES = [
  { id: "restoration", label: "Coral Restoration", percent: 45, color: "#21bcee" },
  { id: "cleanup", label: "Reef Cleanup", percent: 25, color: "#116bf8" },
  { id: "education", label: "Marine Education", percent: 15, color: "#7c3aed" },
  { id: "equipment", label: "Equipment & Boats", percent: 10, color: "#f59e0b" },
  { id: "operations", label: "Operations", percent: 5, color: "#94a3b8" },
] as const;

export type ExpenseBreakdown = {
  totalRaised: number;
  categories: Array<{
    id: string;
    label: string;
    percent: number;
    color: string;
    amount: number;
  }>;
};
