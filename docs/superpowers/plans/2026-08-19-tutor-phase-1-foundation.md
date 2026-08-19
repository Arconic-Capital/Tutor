# Tutor Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working Next.js app with Neon Postgres, the full SBHS course taxonomy seeded, magic-link auth restricted to school email domains, and a personalised dashboard after onboarding.

**Architecture:** Next.js App Router on Vercel; Neon Postgres via Drizzle ORM; Auth.js v5 magic-link auth (Resend) with an email-domain allowlist enforced in the signIn callback; course taxonomy lives in a static config file validated by tests and pushed to the DB by a seed script.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Drizzle ORM + drizzle-kit, Neon Postgres, Auth.js (next-auth@5 beta) + Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-19-tutor-design.md` — Phase 1 covers spec §2 (Users & Auth), §3 (Subject Taxonomy), and the app/database skeleton of §7. Phases 2-4 (resource library, AI tools, forum/moderation) are planned separately.

---

### Task 1: Scaffold the Next.js app

**Files:**
- Create: entire app skeleton via `create-next-app` (in repo root `/Users/alanyang/projects/Tutor`)
- Modify: `package.json` (add vitest)
- Create: `vitest.config.ts`

- [ ] **Step 1: Scaffold in place**

Run (repo root already contains `docs/` and `.git`; create-next-app tolerates non-conflicting files):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes
```

Expected: `src/app/` created, `npm run dev` works.

- [ ] **Step 2: Add Vitest**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

### Task 2: Course taxonomy config (the ~40 SBHS courses)

**Files:**
- Create: `src/lib/curriculum/courses.ts`
- Test: `src/lib/curriculum/courses.test.ts`

Course shape: `{ id, name, stage, yearLevels, category, syllabusNote?, topics }`. `id` is a stable slug used as the DB primary key. Stage 6 subjects appear once but with `yearLevels: [11, 12]` — resources/artifacts will tag the specific course-year (Preliminary vs HSC) via a `courseYear` field on the resource, per spec §3. Topics are seeded now for the HSC-deep priority courses; other courses start with an empty list (admin can add later — Phase 2 includes topic admin).

- [ ] **Step 1: Write the failing test**

`src/lib/curriculum/courses.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { COURSES } from "./courses";

describe("course taxonomy", () => {
  it("has unique ids", () => {
    const ids = COURSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every course has valid stage/yearLevels", () => {
    for (const c of COURSES) {
      expect([5, 6]).toContain(c.stage);
      for (const y of c.yearLevels) {
        if (c.stage === 5) expect([9, 10]).toContain(y);
        else expect([11, 12]).toContain(y);
      }
      expect(c.yearLevels.length).toBeGreaterThan(0);
    }
  });

  it("ids are kebab-case slugs", () => {
    for (const c of COURSES) expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("includes key SBHS stage 6 courses", () => {
    const ids = COURSES.map((c) => c.id);
    for (const id of [
      "english-advanced", "maths-advanced", "maths-ext-1", "maths-ext-2",
      "physics", "chemistry", "biology", "economics", "software-engineering",
    ]) expect(ids).toContain(id);
  });

  it("priority HSC courses have topics", () => {
    const priority = ["maths-advanced", "physics", "chemistry", "biology", "economics", "english-advanced"];
    for (const id of priority) {
      const c = COURSES.find((x) => x.id === id)!;
      expect(c.topics.length).toBeGreaterThan(2);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- courses`
Expected: FAIL — `./courses` not found.

- [ ] **Step 3: Write the config**

`src/lib/curriculum/courses.ts` (complete file):

```ts
export type Stage = 5 | 6;
export type Category =
  | "english" | "mathematics" | "science" | "hsie"
  | "technology" | "creative-arts" | "pdhpe" | "languages" | "other";

export interface Course {
  id: string;            // stable slug, DB primary key
  name: string;
  stage: Stage;
  yearLevels: number[];  // stage 5: [9], [10] or [9,10]; stage 6: [11,12] or [12] for HSC-only extensions
  category: Category;
  syllabusNote?: string; // syllabus-version note per spec §3
  topics: string[];      // seeded topics/modules; empty = added later via admin
}

const c = (
  id: string, name: string, stage: Stage, yearLevels: number[],
  category: Category, topics: string[] = [], syllabusNote?: string,
): Course => ({ id, name, stage, yearLevels, category, topics, syllabusNote });

export const COURSES: Course[] = [
  // ── Stage 5 core (Years 9-10) ──
  c("english-s5", "English (Stage 5)", 5, [9, 10], "english", [], "New 7-10 syllabus from 2024"),
  c("maths-s5", "Mathematics (Stage 5)", 5, [9, 10], "mathematics", [], "New 7-10 syllabus from 2024"),
  c("science-s5", "Science (Stage 5)", 5, [9, 10], "science"),
  c("history-s5", "History (Stage 5)", 5, [9, 10], "hsie"),
  c("geography-s5", "Geography (Stage 5)", 5, [9, 10], "hsie"),
  c("pdhpe-s5", "PDHPE (Stage 5)", 5, [9, 10], "pdhpe"),
  // ── Stage 5 electives (SBHS menu) ──
  c("commerce", "Commerce", 5, [9, 10], "hsie"),
  c("drama-s5", "Drama (Stage 5)", 5, [9, 10], "creative-arts"),
  c("music-s5", "Music (Stage 5)", 5, [9, 10], "creative-arts"),
  c("photographic-digital-media", "Photographic and Digital Media", 5, [9, 10], "creative-arts"),
  c("visual-arts-s5", "Visual Arts (Stage 5)", 5, [9, 10], "creative-arts"),
  c("visual-design", "Visual Design", 5, [9, 10], "creative-arts"),
  c("design-technology-s5", "Design & Technology (Stage 5)", 5, [9, 10], "technology"),
  c("graphics-technology", "Graphics Technology", 5, [9, 10], "technology"),
  c("computing-games-simulations", "Computing Technology: Games and Simulations", 5, [10], "technology"),
  c("computing-software-mechatronics", "Computing Technology: Software Development & Mechatronics", 5, [10], "technology"),
  c("philosophy", "Philosophy", 5, [10], "other"),
  c("pass", "Physical Activity and Sports Studies", 5, [10], "pdhpe"),
  c("history-elective", "History (Elective)", 5, [10], "hsie"),
  c("geography-elective", "Geography (Elective)", 5, [10], "hsie"),
  c("chinese-s5", "Chinese (Stage 5)", 5, [9, 10], "languages"),
  c("french-s5", "French (Stage 5)", 5, [9, 10], "languages"),
  c("german-s5", "German (Stage 5)", 5, [9, 10], "languages"),
  c("japanese-s5", "Japanese (Stage 5)", 5, [9, 10], "languages"),
  c("latin-s5", "Latin (Stage 5)", 5, [9, 10], "languages"),
  c("classical-greek-s5", "Classical Greek (Stage 5)", 5, [9, 10], "languages"),
  // ── Stage 6 English ──
  c("english-advanced", "English Advanced", 6, [11, 12], "english", [
    "Reading to Write", "Narratives that Shape our World", "Critical Study of Literature",
    "Texts and Human Experiences", "Textual Conversations", "The Craft of Writing",
  ]),
  c("english-ext-1", "English Extension 1", 6, [11, 12], "english"),
  c("english-ext-2", "English Extension 2", 6, [12], "english"),
  // ── Stage 6 Mathematics ──
  c("maths-advanced", "Mathematics Advanced", 6, [11, 12], "mathematics", [
    "Functions", "Trigonometric Functions", "Calculus", "Exponential and Logarithmic Functions",
    "Statistical Analysis", "Financial Mathematics",
  ]),
  c("maths-ext-1", "Mathematics Extension 1", 6, [11, 12], "mathematics", [
    "Further Functions", "Polynomials", "Inverse Trigonometric Functions", "Further Calculus",
    "Combinatorics", "Proof by Induction", "Vectors", "Differential Equations", "Binomial Distribution",
  ]),
  c("maths-ext-2", "Mathematics Extension 2", 6, [12], "mathematics", [
    "Proof", "Vectors", "Complex Numbers", "Further Integration", "Mechanics",
  ]),
  // ── Stage 6 Science ──
  c("physics", "Physics", 6, [11, 12], "science", [
    "Kinematics", "Dynamics", "Waves and Thermodynamics", "Electricity and Magnetism",
    "Advanced Mechanics", "Electromagnetism", "The Nature of Light", "From the Universe to the Atom",
  ]),
  c("chemistry", "Chemistry", 6, [11, 12], "science", [
    "Properties and Structure of Matter", "Introduction to Quantitative Chemistry",
    "Reactive Chemistry", "Drivers of Reactions", "Equilibrium and Acid Reactions",
    "Acid/Base Reactions", "Organic Chemistry", "Applying Chemical Ideas",
  ]),
  c("biology", "Biology", 6, [11, 12], "science", [
    "Cells as the Basis of Life", "Organisation of Living Things", "Biological Diversity",
    "Ecosystem Dynamics", "Heredity", "Genetic Change", "Infectious Disease", "Non-infectious Disease",
  ]),
  c("investigating-science", "Investigating Science", 6, [11, 12], "science"),
  // ── Stage 6 HSIE ──
  c("ancient-history", "Ancient History", 6, [11, 12], "hsie"),
  c("modern-history", "Modern History", 6, [11, 12], "hsie"),
  c("history-ext", "History Extension", 6, [12], "hsie"),
  c("business-studies", "Business Studies", 6, [11, 12], "hsie"),
  c("economics", "Economics", 6, [11, 12], "hsie", [
    "Introduction to Economics", "Consumers and Business", "Markets", "Labour Markets",
    "Financial Markets", "Government and the Economy", "The Global Economy",
    "Australia's Place in the Global Economy", "Economic Issues", "Economic Policies and Management",
  ]),
  c("legal-studies", "Legal Studies", 6, [11, 12], "hsie"),
  c("geography-s6", "Geography (Stage 6)", 6, [11, 12], "hsie"),
  c("sor-1", "Studies of Religion I", 6, [11, 12], "hsie"),
  c("sor-2", "Studies of Religion II", 6, [11, 12], "hsie"),
  // ── Stage 6 Technology ──
  c("software-engineering", "Software Engineering", 6, [11, 12], "technology", [
    "Programming Fundamentals", "The Object-Oriented Paradigm", "Programming Mechatronics",
    "Secure Software Architecture", "Programming for the Web", "Software Automation",
    "Software Engineering Project",
  ], "New course, first HSC 2025 (replaced SDD)"),
  c("engineering-studies", "Engineering Studies", 6, [11, 12], "technology"),
  c("design-technology-s6", "Design and Technology (Stage 6)", 6, [11, 12], "technology"),
  // ── Stage 6 Creative Arts ──
  c("music-1", "Music 1", 6, [11, 12], "creative-arts"),
  c("music-2", "Music 2", 6, [11, 12], "creative-arts"),
  c("music-ext", "Music Extension", 6, [12], "creative-arts"),
  c("drama-s6", "Drama (Stage 6)", 6, [11, 12], "creative-arts"),
  c("visual-arts-s6", "Visual Arts (Stage 6)", 6, [11, 12], "creative-arts"),
  // ── Stage 6 PDHPE ──
  c("health-movement-science", "Health and Movement Science", 6, [11, 12], "pdhpe", [],
    "New course, first HSC 2025 (replaced PDHPE Stage 6)"),
  // ── Stage 6 Languages ──
  c("chinese-beginners", "Chinese Beginners", 6, [11, 12], "languages"),
  c("chinese-continuers", "Chinese Continuers", 6, [11, 12], "languages"),
  c("chinese-in-context", "Chinese in Context", 6, [11, 12], "languages"),
  c("chinese-ext", "Chinese Extension", 6, [12], "languages"),
  c("french-beginners", "French Beginners", 6, [11, 12], "languages"),
  c("french-continuers", "French Continuers", 6, [11, 12], "languages"),
  c("french-ext", "French Extension", 6, [12], "languages"),
  c("german-beginners", "German Beginners", 6, [11, 12], "languages"),
  c("german-continuers", "German Continuers", 6, [11, 12], "languages"),
  c("german-ext", "German Extension", 6, [12], "languages"),
  c("japanese-beginners", "Japanese Beginners", 6, [11, 12], "languages"),
  c("japanese-continuers", "Japanese Continuers", 6, [11, 12], "languages"),
  c("japanese-ext", "Japanese Extension", 6, [12], "languages"),
  c("latin-continuers", "Latin Continuers", 6, [11, 12], "languages"),
  c("latin-ext", "Latin Extension", 6, [12], "languages"),
  c("classical-greek-continuers", "Classical Greek Continuers", 6, [11, 12], "languages"),
  c("classical-greek-ext", "Classical Greek Extension", 6, [12], "languages"),
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- courses`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum vitest.config.ts
git commit -m "feat: SBHS course taxonomy config with validation tests"
```

---

### Task 3: Drizzle + Neon schema and seed script

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `scripts/seed.ts`, `.env.local` (untracked), `.env.example`
- Modify: `package.json` (scripts), `.gitignore`

- [ ] **Step 1: Install dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv tsx
```

- [ ] **Step 2: Create the Neon database**

Create a Neon project named `tutor` (Neon console or `neonctl projects create --name tutor`). Put the pooled connection string in `.env.local`:

```
DATABASE_URL=postgres://...pooler...neon.tech/neondb?sslmode=require
```

Create `.env.example` with the same keys and placeholder values. Ensure `.env.local` is gitignored (create-next-app default covers `.env*`; verify).

- [ ] **Step 3: Write the schema**

`src/db/schema.ts` (Phase 1 tables only — resources/artifacts/forum tables come with their phases):

```ts
import {
  pgTable, text, integer, timestamp, primaryKey, uuid, pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: roleEnum("role").notNull().default("student"),
  yearLevel: integer("year_level"), // null until onboarding complete
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(), // slug from courses.ts config
  name: text("name").notNull(),
  stage: integer("stage").notNull(),           // 5 | 6
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

// Auth.js adapter tables (verification tokens for magic links, sessions)
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
```

`src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

`drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Note: drizzle-kit reads `.env` via dotenv — copy `DATABASE_URL` into `.env` too, or run with `dotenv -e .env.local`. Simplest: keep `DATABASE_URL` in `.env` (gitignored) and have `.env.local` for Next-only vars.

- [ ] **Step 4: Push schema**

Run: `npx drizzle-kit push`
Expected: tables created in Neon (verify with `npx drizzle-kit studio` or Neon console).

- [ ] **Step 5: Write the seed script**

`scripts/seed.ts`:

```ts
import "dotenv/config";
import { db } from "../src/db";
import { courses, topics } from "../src/db/schema";
import { COURSES } from "../src/lib/curriculum/courses";
import { eq } from "drizzle-orm";

async function main() {
  for (const c of COURSES) {
    await db
      .insert(courses)
      .values({
        id: c.id, name: c.name, stage: c.stage,
        yearLevels: c.yearLevels, category: c.category,
        syllabusNote: c.syllabusNote ?? null,
      })
      .onConflictDoUpdate({
        target: courses.id,
        set: { name: c.name, stage: c.stage, yearLevels: c.yearLevels, category: c.category, syllabusNote: c.syllabusNote ?? null },
      });
    // topics: replace-all per course keeps config as source of truth
    await db.delete(topics).where(eq(topics.courseId, c.id));
    if (c.topics.length) {
      await db.insert(topics).values(
        c.topics.map((name, i) => ({ courseId: c.id, name, sortOrder: i })),
      );
    }
  }
  console.log(`Seeded ${COURSES.length} courses`);
}

main().then(() => process.exit(0));
```

Add to `package.json` scripts: `"seed": "tsx scripts/seed.ts"`.

- [ ] **Step 6: Run seed and verify**

Run: `npm run seed`
Expected: `Seeded 71 courses` (count = length of COURSES). Re-run to confirm idempotency (no duplicate-key errors).

- [ ] **Step 7: Commit**

```bash
git add src/db drizzle.config.ts scripts/seed.ts .env.example package.json package-lock.json drizzle
git commit -m "feat: Drizzle schema, Neon connection, course seed script"
```

---

### Task 4: Magic-link auth with school-email allowlist

**Files:**
- Create: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth/allowlist.ts`, `src/middleware.ts`, `src/app/signin/page.tsx`
- Test: `src/lib/auth/allowlist.test.ts`

**⚠️ Open config item:** the exact SBHS student email domain must be confirmed with Alan (likely `student.sbhs.nsw.edu.au` and/or `education.nsw.gov.au`). It's an env var — code doesn't hardcode it.

- [ ] **Step 1: Write the failing allowlist test**

`src/lib/auth/allowlist.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isAllowedEmail } from "./allowlist";

const DOMAINS = "student.sbhs.nsw.edu.au,education.nsw.gov.au";

describe("isAllowedEmail", () => {
  it("accepts allowed domains case-insensitively", () => {
    expect(isAllowedEmail("kid@student.sbhs.nsw.edu.au", DOMAINS)).toBe(true);
    expect(isAllowedEmail("KID@Education.NSW.gov.au", DOMAINS)).toBe(true);
  });
  it("rejects other domains and lookalikes", () => {
    expect(isAllowedEmail("kid@gmail.com", DOMAINS)).toBe(false);
    expect(isAllowedEmail("kid@evilstudent.sbhs.nsw.edu.au.attacker.com", DOMAINS)).toBe(false);
    expect(isAllowedEmail("kid@notsbhs.nsw.edu.au", DOMAINS)).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(isAllowedEmail("", DOMAINS)).toBe(false);
    expect(isAllowedEmail("no-at-sign", DOMAINS)).toBe(false);
    expect(isAllowedEmail("two@ats@student.sbhs.nsw.edu.au", DOMAINS)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- allowlist`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement allowlist**

`src/lib/auth/allowlist.ts`:

```ts
export function isAllowedEmail(email: string, domainsCsv: string): boolean {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domain = parts[1];
  return domainsCsv
    .toLowerCase()
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .some((d) => domain === d);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- allowlist`
Expected: PASS.

- [ ] **Step 5: Install and configure Auth.js**

```bash
npm install next-auth@beta @auth/drizzle-adapter resend
npx auth secret   # writes AUTH_SECRET to .env.local — copy into .env too
```

Add to `.env` / `.env.local` and `.env.example`:

```
AUTH_SECRET=...
AUTH_RESEND_KEY=re_...
AUTH_EMAIL_FROM=Tutor <login@updates.yourdomain.com>
ALLOWED_EMAIL_DOMAINS=student.sbhs.nsw.edu.au,education.nsw.gov.au
ADMIN_EMAILS=contact@arconiccap.com
```

`src/auth.ts`:

```ts
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, sessions, verificationTokens } from "@/db/schema";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users as never,
    sessionsTable: sessions as never,
    verificationTokensTable: verificationTokens as never,
  }),
  providers: [
    Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_EMAIL_FROM }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    signIn({ user }) {
      const email = user.email ?? "";
      const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim());
      if (admins.includes(email.toLowerCase())) return true;
      return isAllowedEmail(email, process.env.ALLOWED_EMAIL_DOMAINS ?? "");
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

Note: the Drizzle adapter expects an `accounts` table for OAuth; with only magic-link email it's unused, but the adapter types want it. If `DrizzleAdapter` errors on a missing accounts table, add to `schema.ts`:

```ts
export const accounts = pgTable("accounts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);
```

then `npx drizzle-kit push` and pass `accountsTable: accounts as never` to the adapter.

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

`src/middleware.ts` (protect everything except signin/auth/static):

```ts
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};
```

Add to `src/auth.ts` callbacks (inside the same `callbacks` object):

```ts
    authorized({ auth }) {
      return !!auth?.user;
    },
```

- [ ] **Step 6: Sign-in page**

`src/app/signin/page.tsx`:

```tsx
import { signIn } from "@/auth";

export default function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Tutor — Sydney High</h1>
      <p className="text-sm text-gray-600">
        Sign in with your school email. We&apos;ll send you a login link.
      </p>
      <form
        action={async (formData) => {
          "use server";
          await signIn("resend", { email: formData.get("email") as string, redirectTo: "/" });
        }}
        className="flex flex-col gap-3"
      >
        <input
          name="email" type="email" required placeholder="you@student.sbhs.nsw.edu.au"
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Send login link
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Verify manually**

Run: `npm run dev`. Visit `http://localhost:3000` → expect redirect to `/signin`. Enter your admin email → expect Resend email with working link → lands on `/`. Enter `test@gmail.com` → expect sign-in refused (AccessDenied error page).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: magic-link auth with school email allowlist"
```

---

### Task 5: Onboarding (year level + course enrolment)

**Files:**
- Create: `src/app/onboarding/page.tsx`, `src/app/onboarding/actions.ts`
- Modify: `src/middleware.ts` matcher is unchanged; onboarding redirect lives in the dashboard (Task 6)

- [ ] **Step 1: Server actions**

`src/app/onboarding/actions.ts`:

```ts
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, userCourses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const yearLevel = Number(formData.get("yearLevel"));
  const courseIds = formData.getAll("courseIds").map(String);
  if (![9, 10, 11, 12].includes(yearLevel)) throw new Error("Invalid year level");

  await db.update(users).set({ yearLevel }).where(eq(users.id, session.user.id));
  await db.delete(userCourses).where(eq(userCourses.userId, session.user.id));
  if (courseIds.length) {
    await db.insert(userCourses).values(
      courseIds.map((courseId) => ({ userId: session.user.id, courseId })),
    );
  }
  redirect("/");
}
```

- [ ] **Step 2: Onboarding page**

`src/app/onboarding/page.tsx`:

```tsx
import { db } from "@/db";
import { courses } from "@/db/schema";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const allCourses = await db.select().from(courses).orderBy(courses.name);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Set up your profile</h1>
      <form action={completeOnboarding} className="flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Year level</span>
          <select name="yearLevel" required className="rounded border px-3 py-2">
            <option value="">Select…</option>
            {[9, 10, 11, 12].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Your subjects</legend>
          <div className="grid grid-cols-2 gap-1">
            {allCourses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="courseIds" value={c.id} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Save
        </button>
      </form>
    </main>
  );
}
```

(Filtering the course list by the selected year level client-side is a Phase-1 polish item, not required to ship.)

- [ ] **Step 3: Verify manually**

Sign in, visit `/onboarding`, pick Year 12 + a few courses, save → row in `users.year_level` and `user_courses` (check drizzle studio).

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding
git commit -m "feat: onboarding with year level and course enrolment"
```

---

### Task 6: Dashboard and app shell

**Files:**
- Create: `src/app/page.tsx` (replace scaffold), `src/components/nav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Nav component**

`src/components/nav.tsx`:

```tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Nav() {
  const session = await auth();
  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-bold">Tutor</Link>
      {session?.user && (
        <div className="flex items-center gap-4 text-sm">
          <span>{session.user.email}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/signin" }); }}>
            <button type="submit" className="underline">Sign out</button>
          </form>
        </div>
      )}
    </nav>
  );
}
```

Add `<Nav />` above `{children}` in `src/app/layout.tsx` body, and set metadata title to `Tutor — Sydney High`.

- [ ] **Step 2: Dashboard page**

`src/app/page.tsx` (replaces scaffold homepage):

```tsx
import { auth } from "@/auth";
import { db } from "@/db";
import { users, userCourses, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!me?.yearLevel) redirect("/onboarding");

  const myCourses = await db
    .select({ id: courses.id, name: courses.name })
    .from(userCourses)
    .innerJoin(courses, eq(userCourses.courseId, courses.id))
    .where(eq(userCourses.userId, session.user.id))
    .orderBy(courses.name);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Year {me.yearLevel}</h1>
      <p className="mb-6 text-sm text-gray-600">Your subjects</p>
      <ul className="grid grid-cols-2 gap-3">
        {myCourses.map((c) => (
          <li key={c.id} className="rounded border p-4">
            <span className="font-medium">{c.name}</span>
            {/* Phase 2: links to course library; Phase 3: AI tools */}
          </li>
        ))}
      </ul>
      {myCourses.length === 0 && (
        <p>
          No subjects yet — <Link className="underline" href="/onboarding">set up your profile</Link>.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify full flow + tests + build**

Run: `npm test` → all pass. `npm run build` → succeeds. Manual: fresh sign-in → onboarding redirect → save → dashboard shows courses.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: dashboard and app shell"
```

---

### Task 7: Deploy to Vercel

**Files:**
- None new (Vercel project config lives in Vercel)

- [ ] **Step 1: Create Vercel project and link**

```bash
npx vercel link   # create project "tutor" under Alan's account
```

- [ ] **Step 2: Set env vars in Vercel** (production + preview): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, `ALLOWED_EMAIL_DOMAINS`, `ADMIN_EMAILS`. Also set `AUTH_TRUST_HOST=true`.

- [ ] **Step 3: Deploy preview and smoke-test**

```bash
npx vercel
```

Expected: preview URL loads `/signin`; magic-link flow works end-to-end (admin email), gmail rejected.

- [ ] **Step 4: Push to main**

```bash
git push
```

---

## Self-Review Notes

- **Spec coverage (Phase 1 scope):** §2 auth/roles/onboarding → Tasks 4-6; §3 taxonomy/topics/syllabus tags → Tasks 2-3; §7 stack skeleton → Tasks 1, 3, 7. Resources/AI/forum intentionally deferred to Phases 2-4.
- **Known open item:** exact SBHS student email domain — env var `ALLOWED_EMAIL_DOMAINS`, confirm with Alan before launch (test uses a plausible value; production value is config, not code).
- **Type consistency:** `courses.ts` `Course` fields match `schema.ts` columns and `seed.ts` mapping; `isAllowedEmail(email, domainsCsv)` signature consistent across test/impl/auth callback.
