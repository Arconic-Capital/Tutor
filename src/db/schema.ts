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

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("link"), // link (seeded/official) | file (student upload, Phase 2)
  url: text("url"), // for kind=link
  year: integer("year"), // exam year where applicable
  resourceType: text("resource_type").notNull(), // past_paper | marking_guidelines | syllabus | sample_paper | reference | other
  source: text("source").notNull().default("NESA"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Extracted text from official PDFs/pages — powers the AI; PDFs themselves are never re-hosted.
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kind: text("kind").notNull(), // exam_pdf | guidelines_pdf | page_text
  sourceUrl: text("source_url").notNull().unique(),
  text: text("text").notNull(),
  textLength: integer("text_length").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

// AI-generated study artifacts — flashcards, cheat sheets, notes, formula sheets, practice questions
export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  type: text("type").notNull(), // flashcards | cheat_sheet | study_notes | formula_sheet | practice_questions
  title: text("title").notNull(),
  prompt: text("prompt"), // the topic/request that produced it
  content: text("content").notNull(), // flashcards: JSON {cards:[{front,back}]}; others: markdown
  sourceTitles: text("source_titles"), // human-readable list of source documents
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Saved tutor conversations (one active chat per course for now)
export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  docIds: text("doc_ids"), // csv of document ids pinned for this conversation
  messages: text("messages").notNull().default("[]"), // JSON [{role, content, sources?}]
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
