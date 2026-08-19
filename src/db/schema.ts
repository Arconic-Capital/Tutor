import {
  pgTable, text, integer, timestamp, primaryKey, uuid, pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: roleEnum("role").notNull().default("student"),
  yearLevel: integer("year_level"), // null until onboarding complete
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(), // slug from courses.ts config
  name: text("name").notNull(),
  stage: integer("stage").notNull(), // 5 | 6
  yearLevels: integer("year_levels").array().notNull(),
  category: text("category").notNull(),
  syllabusNote: text("syllabus_note"),
});

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userCourses = pgTable(
  "user_courses",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

// ── Auth.js adapter tables ──
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});
