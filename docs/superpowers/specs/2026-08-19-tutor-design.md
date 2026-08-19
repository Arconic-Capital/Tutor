# Tutor — Design Spec

**Date:** 2026-08-19
**Status:** Approved for planning

## 1. Overview

A study platform for Sydney Boys High School students (Years 9–12): a resource library organised by year and subject, AI tools that generate study artifacts grounded in those resources, and a per-subject forum with comments. Students only — an informal community tool with no official school involvement.

**v1 ships all three pillars:** resource library, AI study tools (the core differentiator), and forum/comments.

## 2. Users & Auth

- **Who:** Sydney Boys High students, Years 9–12.
- **Sign-up:** school student email address, verified by magic link (Auth.js + Resend). Email domain allowlist keeps membership to genuine SBHS students without needing the school's cooperation.
- **Profile:** year level + enrolled courses, driving a personalised dashboard that surfaces the student's own courses first.
- **Roles:** `student` and `admin`. Admin (Alan) gets a moderation queue, seeding tools, and takedown handling.

## 3. Subject Taxonomy

Derived from SBHS 2026–27 curriculum handbooks and NESA course structure (~40 courses). Courses are seeded from a static config file in the repo; each course has topics/modules matching its NESA syllabus.

- **Stage 5 (Years 9–10):**
  - Core: English, Mathematics, Science, History, Geography, PDHPE.
  - Electives (SBHS menu): Commerce, Drama, Music / Music Advanced, Photographic & Digital Media, Visual Arts, Visual Design, Design & Technology, Graphics Technology, Computing Technology (both strands), Philosophy, PASS, elective History/Geography, and languages (Chinese, French, German, Japanese, Latin, Classical Greek).
- **Stage 6:** Year 11 (Preliminary) and Year 12 (HSC) are **separate course-years per subject** — distinct syllabus content, stored and browsed separately.
  - English: Advanced, Extension 1, Extension 2 (no Standard at SBHS).
  - Mathematics: Advanced, Extension 1, Extension 2 (no Standard at SBHS).
  - Sciences: Physics, Chemistry, Biology, Investigating Science.
  - HSIE: Ancient History, Modern History, History Extension, Business Studies, Economics, Legal Studies, Geography, Studies of Religion I/II.
  - Technology: Software Engineering, Engineering Studies, Design and Technology.
  - Creative Arts: Music 1, Music 2, Music Extension, Drama, Visual Arts.
  - PDHPE domain: Health and Movement Science.
  - Languages: Chinese (Beginners/Continuers/in Context/Extension), French (Beginners/Continuers/Extension), German (Beginners/Continuers/Extension), Japanese (Beginners/Continuers/Extension), Latin (Continuers/Extension), Classical Greek (Continuers/Extension).
- **Syllabus versioning:** NSW is mid curriculum reform. Every resource carries a syllabus-version tag (e.g. "Software Engineering — first HSC 2025") so stale material is identifiable.

## 4. Resource Library

### Seeded content
- NESA past HSC exam papers and marking guidelines are indexed as **links to NESA's official pages — never rehosted** (Crown copyright).
- Additional legitimately shareable online resources researched and seeded per course, concentrated on Year 12 HSC subjects at launch ("all years, HSC-deep"). Years 9–11 fill in through uploads over time.

### Student uploads
- Formats: PDF, images, common doc formats. Stored in Vercel Blob.
- Tags: course, topic(s), resource type (study notes, summary, practice questions, trial paper, assignment, other), syllabus version.
- **Consent gate:** upload requires ticking a declaration that the uploader has the right to share the material. Terms of Service include a DMCA-style takedown process. Liability sits with the uploader.
- Trial papers are accepted but flagged internally as higher-risk (CSSA/school copyright is actively enforced) and are the first candidates in any takedown.

### Ingestion pipeline (on upload)
1. Text extraction — PDF parse; Claude vision fallback for scanned documents.
2. AI-generated summary + auto-suggested tags (uploader confirms/edits).
3. Extracted text + summary stored per document — this catalogue entry powers AI document selection, and preserves a migration-free path to embeddings later.

## 5. AI Study Tools

- **Interface:** an open prompt box scoped to a course (optionally a topic), with quick-action buttons: **study notes, flashcards, one-page cheat sheet, practice paper, Q&A chat** — plus free-form "make me anything".
- **Context strategy — two-stage full-document selection:**
  1. A fast, cheap pass (Haiku-class) reads the course's document catalogue (titles, tags, summaries) and selects the documents relevant to the request.
  2. The full extracted text of selected documents goes into the generation call (Sonnet-class) with an artifact-type-specific prompt.
  - Whole documents beat chunks for study-artifact quality at this scale (10–50 docs per course). No embedding pipeline in v1; schema supports adding pgvector later.
- **Outputs:** rendered in-app (flashcards get a flip/review mode), exportable as PDF, with citations back to source resources.
- **Shared artifacts:** generated outputs are saved to the course library labelled "AI-generated", so popular artifacts are reused rather than regenerated.
- **Limits:** free, 20 generations/day per student, enforced via a generations log. Global spend alarm on the API key.

## 6. Forum & Comments (v1)

- **Per-course forum:** threads (markdown + images), replies, upvotes. No reputation system in v1.
- **Comments** on any resource and any generated artifact.
- **Moderation:** report/flag button on all content; admin queue to remove content, ban users, and process takedown requests.

## 7. Architecture & Stack

- **Next.js (App Router) on Vercel** — same patterns as asx/Prospector.
- **Neon Postgres** with Drizzle ORM.
- **Vercel Blob** for file storage.
- **Claude API** for extraction assist, summarisation, and generation.
- **Auth.js** (magic link) + **Resend** for email.

### Data model (core tables)
- `users` — role, year level, email
- `user_courses` — enrolments
- `courses` — static-seeded, stage, year, name, syllabus version
- `topics` — per course
- `resources` — file or link, course/topic tags, type, extracted_text, summary, uploader, declaration_accepted_at, status (active/flagged/removed), risk flag
- `artifacts` — generated outputs: type, prompt, content, source resource ids, creator
- `generations_log` — per-user daily rate limiting
- `threads`, `posts` — forum
- `comments` — polymorphic on resources/artifacts
- `reports` — moderation queue

### Error handling
- Upload/extraction failures surface to the uploader with retry; documents without extractable text are stored but excluded from AI context (visible warning).
- Generation failures don't consume the daily allowance.
- Oversized context (topic slice exceeds window): selection pass tightens to fewer, most-relevant documents.

## 8. Testing

- Unit tests for rate limiting, document selection logic, and tag/taxonomy integrity (course config validates against schema).
- Integration tests for the upload→extract→catalogue pipeline and the two-stage generation flow (mocked Claude API).
- Manual smoke pass on auth, upload consent gate, and moderation queue before launch.

## 9. Legal & Safety Posture

- Never rehost NESA papers; link only.
- Uploader declaration + ToS + takedown process shifts liability to uploaders.
- Trial papers flagged and quietly removable.
- Student-authored notes are the safe core of shared content.

## 10. Out of Scope (v1)

Spaced-repetition scheduling, teacher accounts, other schools / multi-tenancy, payments, mobile app, email digests, reputation systems.
