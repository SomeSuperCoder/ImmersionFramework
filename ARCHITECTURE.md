# ImmersionFramework — Architecture Specification

> **Version:** 1.0 · **Date:** 2026-08-17 · **Scope:** Feature #1 MVP (YouTube video + real-time subtitles)
> **Status:** Authoritative blueprint — implementation follows this spec exactly.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Directory Structure](#3-directory-structure)
4. [Module Boundaries](#4-module-boundaries)
5. [Database Schema](#5-database-schema)
6. [API Contracts](#6-api-contracts)
7. [Data Flow](#7-data-flow)
8. [Error Handling](#8-error-handling)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Order](#10-implementation-order)
11. [Decision Record](#11-decision-record)

---

## 1. System Overview

ImmersionFramework is a language immersion platform that lets users watch YouTube videos with synchronized, real-time subtitles. The user pastes a YouTube URL; the system extracts subtitles via yt-dlp, caches them in Postgres, and serves them alongside an embedded YouTube player. The frontend polls the player's current time and highlights the active subtitle line, creating an immersive reading-while-watching experience. Feature #1 is the foundation — all future features (flashcards, translation, vocabulary mining, sentence generation) build on top of this subtitle sync core.

---

## 2. Architecture Principles

### 2.1 Modular Monolith

NestJS modules enforce boundaries within a single deployable unit. Each module owns its domain, exposes a narrow public interface, and communicates via injected service abstractions — never via direct imports of another module's internals.

### 2.2 Dependency Injection at Composition Root

Every dependency is constructed and wired in `AppModule` (the composition root). No module instantiates its own database connection, HTTP client, or external tool executor. All dependencies are injected via NestJS's built-in DI container.

### 2.3 One Responsibility Per Module

Each module has exactly ONE reason to change. If a module handles both video metadata and subtitle parsing, it has two responsibilities — split it.

### 2.4 Boundaries by Dependency Direction

Dependencies flow inward: controllers depend on services, services depend on repositories, repositories depend on Drizzle schema. No cycles. No module reaches into another's private directory.

### 2.5 Validation at Boundaries

All external input is validated with Zod schemas at the API boundary (controller level). Internal service calls use TypeScript types — no runtime re-validation of trusted internal data.

### 2.6 Cache Aggressively

YouTube captions are immutable once fetched. Every subtitle extraction is cached in Postgres. The cache is the source of truth after first fetch — no re-extraction on subsequent requests.

### 2.7 Feature #1 Scope Discipline

No auth, no user accounts, no translation service, no vocabulary module, no flashcard logic. Feature #1 = URL → subtitles → synced display. Everything else is deferred.

---

## 3. Directory Structure

```
immersion-framework/
├── apps/
│   ├── web/                            # React frontend (Vite + React Compiler)
│   │   ├── src/
│   │   │   ├── app/                    # App shell, routing, layout
│   │   │   │   ├── App.tsx
│   │   │   │   ├── routes.tsx
│   │   │   │   └── providers.tsx       # QueryClient, theme, etc.
│   │   │   ├── features/               # Feature-scoped components + hooks
│   │   │   │   └── video/              # Feature #1: video player + subtitle sync
│   │   │   │       ├── VideoPlayerPage.tsx
│   │   │   │       ├── SubtitleDisplay.tsx
│   │   │   │       ├── SubtitleLine.tsx
│   │   │   │       ├── UrlInputForm.tsx
│   │   │   │       ├── hooks/
│   │   │   │       │   ├── useVideoPlayer.ts
│   │   │   │       │   └── useSubtitleSync.ts
│   │   │   │       └── api/
│   │   │   │           └── videos.ts   # API client functions
│   │   │   ├── components/             # Shared UI components (shadcn/ui)
│   │   │   │   └── ui/                 # shadcn primitives (Button, Input, etc.)
│   │   │   ├── lib/                    # Utilities, API client, constants
│   │   │   │   ├── api-client.ts       # Fetch wrapper with base URL
│   │   │   │   └── utils.ts
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                            # NestJS backend (modular monolith)
│       └── src/
│           ├── main.ts                 # Bootstrap, global pipes, CORS
│           ├── app.module.ts           # Composition root — wires all modules
│           ├── common/                 # Shared infrastructure
│           │   ├── filters/
│           │   │   └── http-exception.filter.ts
│           │   ├── interceptors/
│           │   │   └── logging.interceptor.ts
│           │   ├── guards/
│           │   ├── pipes/
│           │   │   └── zod-validation.pipe.ts
│           │   └── errors/
│           │       └── app-error.ts
│           └── modules/
│               ├── video/              # Feature #1: URL → metadata
│               │   ├── video.module.ts
│               │   ├── video.controller.ts
│               │   ├── video.service.ts
│               │   ├── video.repository.ts
│               │   ├── dto/
│               │   │   └── create-video.dto.ts
│               │   └── __tests__/
│               │       ├── video.service.test.ts
│               │       └── video.repository.test.ts
│               └── subtitle/           # Feature #1: yt-dlp → parse → cache → serve
│                   ├── subtitle.module.ts
│                   ├── subtitle.controller.ts
│                   ├── subtitle.service.ts
│                   ├── subtitle.repository.ts
│                   ├── parsers/
│                   │   ├── subtitle-parser.interface.ts
│                   │   └── vtt-parser.ts
│                   ├── executors/
│                   │   ├── ytdlp.executor.ts
│                   │   └── ytdlp.executor.interface.ts
│                   ├── dto/
│                   │   └── subtitle-query.dto.ts
│                   └── __tests__/
│                       ├── subtitle.service.test.ts
│                       ├── subtitle.repository.test.ts
│                       ├── vtt-parser.test.ts
│                       └── ytdlp.executor.test.ts
│
├── packages/
│   └── shared/                         # Zod schemas + TypeScript types + utils
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── video.schema.ts     # Zod: YouTube URL validation, video metadata
│       │   │   └── subtitle.schema.ts  # Zod: subtitle cue, track, query params
│       │   ├── types/
│       │   │   ├── video.types.ts      # Inferred types from Zod schemas
│       │   │   └── subtitle.types.ts
│       │   └── index.ts               # Re-exports
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── postgres/
│   │   └── init.sql                    # DB creation script
│   └── podman-compose.yaml             # Postgres + app services
│
├── drizzle/                            # Drizzle Kit config + migrations
│   ├── drizzle.config.ts
│   └── migrations/
│       └── 0000_initial.sql
│
├── pnpm-workspace.yaml
├── Justfile                            # Quick commands
├── package.json                        # Root package.json (scripts only)
├── tsconfig.base.json                  # Shared TS config
├── .gitignore
├── ROADMAP.md
└── ARCHITECTURE.md                     # This file
```

### Key Structural Decisions

| Decision | Rationale |
|----------|-----------|
| `packages/shared/` for Zod schemas | Single source of truth for validation — backend and frontend both import from here. No schema drift. |
| `features/video/` on frontend | Feature-scoped directory — each feature owns its page, components, hooks, and API calls. Scales to features #2-7. |
| `executors/` in subtitle module | yt-dlp is an external dependency behind an interface — swappable without touching parsing or caching logic. |
| `parsers/` in subtitle module | VTT parser is behind an interface — adding SRT support later is one new file, zero edits to existing code. |
| `common/` for NestJS cross-cutting | Filters, interceptors, pipes live outside modules — shared infrastructure, not feature logic. |
| `drizzle/` at root | Drizzle Kit config and migrations are project-level, not app-level — they manage the database schema independently. |

---

## 4. Module Boundaries

### 4.1 VideoModule

**Responsibility:** Manages video metadata — validating YouTube URLs, fetching metadata via yt-dlp, and caching in Postgres.

**Public Interface:**
- `VideoService.getOrCreate(url: string): Promise<Video>` — Validates URL, checks cache, fetches metadata if miss, returns cached or fresh.
- `VideoService.findById(id: string): Promise<Video | null>` — Fetches video by ID.
- `VideoController` — `POST /api/v1/videos` (create/get by URL), `GET /api/v1/videos/:id` (get by ID).

**Dependencies (injected):**
- `VideoRepository` (abstract) — DB access for `videos` table.
- `YtdlpExecutor` (abstract) — External tool for metadata extraction.

**Does NOT touch:**
- Subtitle data, subtitle parsing, subtitle storage. VideoModule knows nothing about subtitles.

### 4.2 SubtitleModule

**Responsibility:** Extracts subtitles from YouTube videos via yt-dlp, parses VTT format into structured cues, caches in Postgres, and serves to frontend.

**Public Interface:**
- `SubtitleService.extractForVideo(videoId: string): Promise<SubtitleTrack>` — Extracts subtitles for a video (checks cache first).
- `SubtitleService.findByVideoId(videoId: string): Promise<SubtitleTrack | null>` — Fetches cached subtitles without extraction.
- `SubtitleController` — `GET /api/v1/videos/:videoId/subtitles` (fetch cached), `POST /api/v1/videos/:videoId/subtitles/extract` (trigger extraction).

**Dependencies (injected):**
- `SubtitleRepository` (abstract) — DB access for `subtitle_segments` table.
- `VideoService` (abstract) — To verify video exists before subtitle extraction.
- `SubtitleParser` (abstract) — VTT parsing strategy.
- `YtdlpExecutor` (abstract) — External tool for subtitle download.

**Does NOT touch:**
- Video metadata CRUD, vocabulary, translation, flashcards. SubtitleModule owns only subtitle extraction, parsing, and storage.

### 4.3 SharedModule (packages/shared)

**Responsibility:** Zod schemas, TypeScript type definitions, and utility functions shared between frontend and backend.

**Public Interface:**
- `CreateVideoRequestSchema` — Zod schema for POST /api/v1/videos request body.
- `VideoResponseSchema` — Zod schema for video response shape.
- `SubtitleCueSchema`, `SubtitleTrackSchema` — Zod schemas for subtitle data.
- `SubtitleQuerySchema` — Zod schema for query parameters.

**Does NOT touch:**
- Any NestJS module logic, DB access, external tool execution. Pure types and validation.

### 4.4 AppModule (Composition Root)

**The ONE place where all dependencies are wired.** Constructs all repositories, services, executors, and parsers. Injects them into modules. No other file instantiates dependencies.

```typescript
// app.module.ts — the composition root
@Module({
  imports: [
    VideoModule.register({
      videoRepository: new DrizzleVideoRepository(db),
      ytdlpExecutor: new YtdlpExecutor(),
    }),
    SubtitleModule.register({
      subtitleRepository: new DrizzleSubtitleRepository(db),
      subtitleParser: new VttParser(),
      ytdlpExecutor: new YtdlpExecutor(),
    }),
  ],
})
export class AppModule {}
```

### Module Dependency Graph

```
AppModule (composition root)
├── VideoModule
│   ├── VideoRepository (Drizzle)
│   └── YtdlpExecutor
└── SubtitleModule
    ├── SubtitleRepository (Drizzle)
    ├── VideoService (from VideoModule)
    ├── SubtitleParser (VTT)
    └── YtdlpExecutor
```

**Direction:** Controllers → Services → Repositories. No cycles. SubtitleModule depends on VideoModule's service (to verify video exists). VideoModule has zero knowledge of SubtitleModule.

---

## 5. Database Schema

### 5.1 Drizzle Configuration

```typescript
// drizzle/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../apps/api/src/**/*.schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 5.2 Feature #1 Tables

```typescript
// apps/api/src/modules/video/video.schema.ts
import { pgTable, text, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const videos = pgTable('videos', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  youtubeId: text('youtube_id').notNull(),
  title: text('title').notNull(),
  channel: text('channel').notNull(),
  durationMs: integer('duration_ms').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  language: text('language').default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_videos_youtube_id').on(table.youtubeId),
]);
```

```typescript
// apps/api/src/modules/subtitle/subtitle.schema.ts
import { pgTable, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { videos } from '../video/video.schema';

export const subtitleSegments = pgTable('subtitle_segments', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  videoId: text('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  text: text('text').notNull(),
  segmentIndex: integer('segment_index').notNull(),
  language: text('language').notNull().default('en'),
  isAutoGenerated: boolean('is_auto_generated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_subtitle_video_id').on(table.videoId),
  index('idx_subtitle_start_ms').on(table.startMs),
]);
```

### 5.3 Schema Constraints

| Table | Column | Type | Constraint | Index |
|-------|--------|------|------------|-------|
| `videos` | `id` | UUID (text) | PK, default `gen_random_uuid()` | — |
| `videos` | `youtube_id` | text | NOT NULL, UNIQUE | `idx_videos_youtube_id` |
| `videos` | `title` | text | NOT NULL | — |
| `videos` | `channel` | text | NOT NULL | — |
| `videos` | `duration_ms` | integer | NOT NULL | — |
| `videos` | `thumbnail_url` | text | NOT NULL | — |
| `videos` | `language` | text | DEFAULT 'en' | — |
| `subtitle_segments` | `id` | UUID (text) | PK, default `gen_random_uuid()` | — |
| `subtitle_segments` | `video_id` | text | NOT NULL, FK → `videos.id` CASCADE | `idx_subtitle_video_id` |
| `subtitle_segments` | `start_ms` | integer | NOT NULL | `idx_subtitle_start_ms` |
| `subtitle_segments` | `end_ms` | integer | NOT NULL | — |
| `subtitle_segments` | `text` | text | NOT NULL | — |
| `subtitle_segments` | `segment_index` | integer | NOT NULL | — |
| `subtitle_segments` | `language` | text | NOT NULL, DEFAULT 'en' | — |
| `subtitle_segments` | `is_auto_generated` | boolean | NOT NULL, DEFAULT false | — |

### 5.4 Index Strategy

- **`idx_videos_youtube_id`** — unique index on `youtube_id`. Ensures one row per YouTube video. Used for cache lookup on every incoming URL.
- **`idx_subtitle_video_id`** — index on `video_id`. All subtitle queries filter by video. This is the most-used index.
- **`idx_subtitle_start_ms`** — index on `start_ms`. Used for time-range queries (finding the active cue at a given timestamp).

---

## 6. API Contracts

### 6.1 Shared Zod Schemas

```typescript
// packages/shared/src/schemas/video.schema.ts
import { z } from 'zod';

// ─── Request Schemas ───

export const CreateVideoRequestSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => {
      const pattern = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
      return pattern.test(url);
    },
    { message: 'Must be a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)' },
  ),
  language: z.string().default('en'),
});

export type CreateVideoRequest = z.infer<typeof CreateVideoRequestSchema>;

// ─── Response Schemas ───

export const VideoResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    youtubeId: z.string(),
    title: z.string(),
    channel: z.string(),
    durationMs: z.number().int().positive(),
    thumbnailUrl: z.string().url(),
    language: z.string(),
    createdAt: z.string().datetime(),
  }),
});

export type VideoResponse = z.infer<typeof VideoResponseSchema>;
```

```typescript
// packages/shared/src/schemas/subtitle.schema.ts
import { z } from 'zod';

// ─── Core Data Schemas ───

export const SubtitleCueSchema = z.object({
  start: z.number().min(0),   // seconds
  end: z.number().min(0),     // seconds
  text: z.string().min(1),
});

export type SubtitleCue = z.infer<typeof SubtitleCueSchema>;

export const SubtitleTrackSchema = z.object({
  videoId: z.string(),
  language: z.string(),
  isAutoGenerated: z.boolean(),
  cues: z.array(SubtitleCueSchema),
});

export type SubtitleTrack = z.infer<typeof SubtitleTrackSchema>;

// ─── Query Schemas ───

export const SubtitleQuerySchema = z.object({
  language: z.string().optional(),
});

export type SubtitleQuery = z.infer<typeof SubtitleQuerySchema>;

// ─── Response Schemas ───

export const SubtitleResponseSchema = z.object({
  data: SubtitleTrackSchema,
});

export type SubtitleResponse = z.infer<typeof SubtitleResponseSchema>;

export const SubtitleErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  }),
});
```

### 6.2 Endpoint Definitions

#### POST /api/v1/videos

Create or retrieve a video by YouTube URL. If cached, returns existing. If new, extracts metadata via yt-dlp, stores, and returns.

**Request:**
```
POST /api/v1/videos
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "language": "en"
}
```

**Success Response (200 — cached):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "channel": "Rick Astley",
    "durationMs": 212000,
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "language": "en",
    "createdAt": "2026-08-17T12:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 — Invalid URL
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "url", "message": "Must be a valid YouTube URL" }
    ]
  }
}

// 502 — yt-dlp extraction failed
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "Failed to extract video metadata. The video may be private or unavailable."
  }
}
```

#### GET /api/v1/videos/:id

Retrieve cached video metadata by ID.

**Request:**
```
GET /api/v1/videos/550e8400-e29b-41d4-a716-446655440000
```

**Success Response (200):** Same shape as POST response.

**Error Response (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Video not found"
  }
}
```

#### POST /api/v1/videos/:videoId/subtitles/extract

Trigger subtitle extraction for a video. Returns the extracted subtitle track. Caches in DB — subsequent calls return cached version.

**Request:**
```
POST /api/v1/videos/550e8400-e29b-41d4-a716-446655440000/subtitles/extract
Content-Type: application/json

{
  "language": "en"
}
```

**Success Response (200):**
```json
{
  "data": {
    "videoId": "550e8400-e29b-41d4-a716-446655440000",
    "language": "en",
    "isAutoGenerated": true,
    "cues": [
      { "start": 0.0, "end": 2.5, "text": "We're no strangers to love" },
      { "start": 2.5, "end": 5.0, "text": "You know the rules and so do I" }
    ]
  }
}
```

**Error Responses:**
```json
// 404 — Video not found (must create video first)
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Video not found. Create the video first via POST /api/v1/videos."
  }
}

// 404 — No captions available
{
  "error": {
    "code": "NO_CAPTIONS",
    "message": "This video has no available subtitles. It may not have captions."
  }
}

// 502 — yt-dlp extraction failed
{
  "error": {
    "code": "SUBTITLE_EXTRACTION_FAILED",
    "message": "Failed to extract subtitles. yt-dlp returned an error."
  }
}
```

#### GET /api/v1/videos/:videoId/subtitles

Fetch cached subtitles without triggering extraction. Returns null data if not cached.

**Request:**
```
GET /api/v1/videos/550e8400-e29b-41d4-a716-446655440000/subtitles?language=en
```

**Success Response (200):** Same shape as extract response.

**Success Response (200 — not cached):**
```json
{
  "data": null
}
```

### 6.3 Error Envelope Convention

Every error response follows this shape:
```typescript
{
  error: {
    code: string;           // Machine-readable, stable: "VALIDATION_ERROR", "NOT_FOUND"
    message: string;        // Human-readable, may change
    details?: Array<{       // Optional field-level errors
      field: string;
      message: string;
    }>;
  }
}
```

### 6.4 Status Code Mapping

| Condition | Status Code | Error Code |
|-----------|-------------|------------|
| Invalid request body / URL | 400 | `VALIDATION_ERROR` |
| Video not found | 404 | `NOT_FOUND` |
| No captions available | 404 | `NO_CAPTIONS` |
| yt-dlp metadata extraction failed | 502 | `EXTERNAL_SERVICE_ERROR` |
| yt-dlp subtitle extraction failed | 502 | `SUBTITLE_EXTRACTION_FAILED` |
| Internal server error | 500 | `INTERNAL_ERROR` |

---

## 7. Data Flow

### 7.1 Subtitle Fetch + Display Flow (Feature #1)

```
┌─────────────────────────────────────────────────────────────┐
│  USER PASTES YOUTUBE URL                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: UrlInputForm.tsx                                  │
│  • Zod validation (CreateVideoRequestSchema)                 │
│  • POST /api/v1/videos { url, language }                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS: VideoController → VideoService.getOrCreate(url)     │
│  1. Extract YouTube ID from URL                              │
│  2. Check Postgres cache (videos table, youtube_id index)   │
│  3a. HIT → return cached Video                              │
│  3b. MISS → continue ↓                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ (miss path)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS: VideoService → YtdlpExecutor.getMetadata(ytId)     │
│  • child_process.execFile('yt-dlp', ['--dump-json', url])   │
│  • Parse JSON output → { title, channel, duration, thumb }  │
│  • Store in videos table                                     │
│  • Return Video                                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: Receives video metadata                           │
│  • Renders YouTube IFrame embed (youtubeId)                  │
│  • Auto-triggers subtitle extraction                         │
│  • POST /api/v1/videos/:videoId/subtitles/extract            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS: SubtitleController → SubtitleService.extractForVideo│
│  1. Verify video exists (VideoService.findById)              │
│  2. Check subtitle cache (subtitle_segments table)           │
│  3a. HIT → return cached SubtitleTrack                       │
│  3b. MISS → continue ↓                                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ (miss path)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS: SubtitleService → YtdlpExecutor.getSubtitles(ytId) │
│  • child_process.execFile('yt-dlp', ['--write-sub',         │
│    '--sub-format', 'vtt', '--skip-download', url])          │
│  • Reads output .vtt file                                    │
│  • SubtitleParser (VttParser) → structured cues             │
│  • Store each cue in subtitle_segments table                 │
│  • Return SubtitleTrack                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: Receives SubtitleTrack                            │
│  • SubtitleDisplay.tsx renders all cues                      │
│  • useSubtitleSync hook polls player.getCurrentTime()        │
│    at 100ms interval                                         │
│  • Finds active cue: cue.start <= currentTime && cue.end > t │
│  • SubtitleLine.tsx highlights active line (CSS class)       │
│  • Auto-scrolls to keep active line in view                  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 VTT Parsing Flow

```
Raw VTT string
    │
    ▼
Split by double newline → cue blocks
    │
    ▼
For each block:
  • Extract timestamp line: "00:00:01.000 --> 00:00:03.500"
  • Parse start/end: HH:MM:SS.mmm → milliseconds
  • Extract text lines (strip HTML tags, VTT formatting)
  • Build SubtitleCue { start, end, text }
    │
    ▼
Sort by start time → SubtitleCue[]
    │
    ▼
Return SubtitleTrack { videoId, language, isAutoGenerated, cues }
```

### 7.3 Frontend Sync Algorithm

```typescript
// useSubtitleSync.ts — core sync logic
function useSubtitleSync(player: YouTubePlayer, cues: SubtitleCue[]) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = player.getCurrentTime(); // seconds
      const index = cues.findIndex(
        (cue) => cue.start <= currentTime && cue.end > currentTime,
      );
      setActiveIndex(index);
    }, 100); // 100ms poll — smooth enough for subtitle transitions

    return () => clearInterval(interval);
  }, [player, cues]);

  return { activeIndex };
}
```

**Performance note:** 100ms polling is acceptable for subtitle sync. The YouTube IFrame API's `getCurrentTime()` is a synchronous in-memory read — no network cost per poll. The interval is cleared on unmount.

---

## 8. Error Handling

### 8.1 Error Categories

| Category | Code | Status | When |
|----------|------|--------|------|
| `VALIDATION_ERROR` | `VALIDATION_ERROR` | 400 | Invalid request body, bad URL format |
| `NOT_FOUND` | `NOT_FOUND` | 404 | Video or subtitle not in DB |
| `NO_CAPTIONS` | `NO_CAPTIONS` | 404 | Video exists but has zero subtitle tracks |
| `EXTERNAL_SERVICE_ERROR` | `EXTERNAL_SERVICE_ERROR` | 502 | yt-dlp metadata extraction failed |
| `SUBTITLE_EXTRACTION_FAILED` | `SUBTITLE_EXTRACTION_FAILED` | 502 | yt-dlp subtitle download failed |
| `INTERNAL_ERROR` | `INTERNAL_ERROR` | 500 | Unexpected server error |

### 8.2 Error Scenarios

#### Scenario: Video has no captions

```
1. User pastes URL → POST /api/v1/videos → video created (metadata OK)
2. Frontend triggers POST /api/v1/videos/:id/subtitles/extract
3. Backend runs yt-dlp --write-sub → no subtitle file produced
4. SubtitleService detects empty output
5. Returns 404 with code: "NO_CAPTIONS"
6. Frontend shows: "This video has no available subtitles."
7. User can still watch video — subtitles just aren't available
```

**Handling strategy:** Graceful degradation. The video player still works; subtitle display area shows the "no captions" message. No crash, no retry.

#### Scenario: yt-dlp fails

```
1. Backend spawns yt-dlp process
2. Process exits with non-zero code OR times out (30s limit)
3. AppError with category: EXTERNAL, code: SUBTITLE_EXTRACTION_FAILED
4. Returns 502 to client
5. Frontend shows: "Failed to load subtitles. Please try again."
6. User can retry — no automatic retry server-side (idempotent operation)
```

**Handling strategy:** No automatic retry. yt-dlp failures are usually persistent (video private, geo-blocked, rate-limited). Automatic retry wastes resources. User-initiated retry is sufficient.

#### Scenario: Invalid URL

```
1. User pastes "not a url"
2. Zod validation fails at controller boundary
3. NestJS global validation pipe catches ZodError
4. Returns 400 with field-level details
5. Frontend shows inline validation error on the input field
```

**Handling strategy:** Fail fast at the boundary. Never pass invalid data to services.

#### Scenario: DB connection error

```
1. Postgres is unreachable or connection pool exhausted
2. Drizzle throws connection error
3. AppError with category: INTERNAL
4. Returns 500 (generic message — no DB details leaked)
5. Logged server-side with full context
6. Frontend shows: "Something went wrong. Please try again."
```

**Handling strategy:** Never expose DB internals. Log the full error server-side. Return a generic client message.

### 8.3 AppError Class

```typescript
// apps/api/src/common/errors/app-error.ts
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Array<{ field: string; message: string }>,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 8.4 Global Exception Filter

```typescript
// apps/api/src/common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof AppError) {
      response.status(exception.statusCode).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      });
      return;
    }

    // Unknown error — log full context, return generic
    console.error('Unhandled exception:', exception);
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}
```

### 8.5 Zod Validation Pipe

```typescript
// apps/api/src/common/pipes/zod-validation.pipe.ts
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError(
        'Invalid input',
        ErrorCategory.VALIDATION,
        400,
        'VALIDATION_ERROR',
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }
    return result.data;
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (vitest)

| Module | What to Test | Approach |
|--------|-------------|----------|
| `VideoService` | `getOrCreate` — cache hit vs miss, URL extraction | Mock `VideoRepository` + `YtdlpExecutor`. Verify correct calls. |
| `VideoRepository` | CRUD operations | Use in-memory Postgres (testcontainers) or Drizzle's `:memory:` adapter |
| `SubtitleService` | `extractForVideo` — cache hit vs miss, no captions case | Mock `SubtitleRepository`, `VideoService`, `YtdlpExecutor`, `SubtitleParser` |
| `SubtitleRepository` | CRUD operations | Same as VideoRepository |
| `VttParser` | Parse valid VTT, handle malformed input, handle empty input | Pure function tests — no mocks needed. Feed VTT strings, assert cue arrays. |
| `YtdlpExecutor` | Process spawn, timeout handling, error cases | Mock `child_process.execFile`. Verify correct args, timeout behavior. |
| `Zod schemas` | Valid inputs pass, invalid inputs fail, edge cases | Pure function tests — assert schema validation results. |
| `AppError` | Construction, category/statusCode/code mapping | Pure class tests. |

### 9.2 E2E Tests (Playwright)

| Flow | What to Test | Steps |
|------|-------------|-------|
| **Happy path** | Full subtitle fetch + display | 1. Navigate to app. 2. Paste YouTube URL. 3. Click submit. 4. Verify video embeds. 5. Verify subtitles appear. 6. Verify active line highlights as video plays. |
| **No captions** | Graceful degradation | 1. Paste URL of video with no captions. 2. Submit. 3. Verify "no captions" message appears. 4. Verify video still plays. |
| **Invalid URL** | Validation error display | 1. Paste invalid URL. 2. Submit. 3. Verify inline error message appears. 4. Verify no API call made. |
| **Cached video** | Second request returns fast | 1. Paste URL, submit (cold). 2. Navigate away. 3. Paste same URL again. 4. Verify instant response (no yt-dlp delay). |

### 9.3 Test Configuration

```typescript
// vitest.config.ts (apps/api)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.schema.ts'],
    },
  },
});
```

### 9.4 Test Naming Convention

```
describe('SubtitleService', () => {
  describe('extractForVideo', () => {
    it('should return cached subtitles when available', async () => { ... });
    it('should extract and cache subtitles on cache miss', async () => { ... });
    it('should throw NO_CAPTIONS when video has no subtitles', async () => { ... });
    it('should throw EXTERNAL_SERVICE_ERROR when yt-dlp fails', async () => { ... });
  });
});
```

---

## 10. Implementation Order

### Phase 1: Scaffold (Day 1)

| Step | Task | Output |
|------|------|--------|
| 1.1 | Create pnpm workspace monorepo | `pnpm-workspace.yaml`, root `package.json` |
| 1.2 | Scaffold NestJS app (`apps/api`) | `nest new`, basic module structure |
| 1.3 | Scaffold React app (`apps/web`) | `vite create`, React Compiler config |
| 1.4 | Create `packages/shared` | Package with Zod schemas |
| 1.5 | Configure Justfile | `just dev`, `just test`, `just db:migrate` |
| 1.6 | Configure podman-compose | Postgres service |
| 1.7 | Configure Drizzle | `drizzle.config.ts`, connection |

### Phase 2: Database (Day 1-2)

| Step | Task | Output |
|------|------|--------|
| 2.1 | Write Drizzle schema for `videos` table | `video.schema.ts` |
| 2.2 | Write Drizzle schema for `subtitle_segments` table | `subtitle.schema.ts` |
| 2.3 | Generate initial migration | `drizzle-kit generate` |
| 2.4 | Run migration against local Postgres | `drizzle-kit migrate` |

### Phase 3: Backend API (Day 2-3)

| Step | Task | Output |
|------|------|--------|
| 3.1 | Implement `VideoRepository` | CRUD for videos table |
| 3.2 | Implement `VideoService` | getOrCreate, findById |
| 3.3 | Implement `VideoController` | POST /api/v1/videos, GET /api/v1/videos/:id |
| 3.4 | Implement `VttParser` | Parse VTT string → SubtitleCue[] |
| 3.5 | Implement `YtdlpExecutor` | child_process wrapper |
| 3.6 | Implement `SubtitleRepository` | CRUD for subtitle_segments table |
| 3.7 | Implement `SubtitleService` | extractForVideo, findByVideoId |
| 3.8 | Implement `SubtitleController` | POST extract, GET subtitles |
| 3.9 | Wire `AppModule` (composition root) | DI for all modules |
| 3.10 | Add global pipes + filters | ZodValidationPipe, AllExceptionsFilter |

### Phase 4: Frontend (Day 3-4)

| Step | Task | Output |
|------|------|--------|
| 4.1 | Set up shadcn/ui components | Button, Input, Card |
| 4.2 | Implement `UrlInputForm` | YouTube URL input with validation |
| 4.3 | Implement API client functions | `createVideo`, `extractSubtitles`, `getSubtitles` |
| 4.4 | Implement `VideoPlayerPage` | Main page layout |
| 4.5 | Implement YouTube IFrame embed | `react-youtube` or direct IFrame |
| 4.6 | Implement `SubtitleDisplay` | Render cue list |
| 4.7 | Implement `SubtitleLine` | Single line with highlight state |
| 4.8 | Implement `useVideoPlayer` hook | Player state, getCurrentTime |
| 4.9 | Implement `useSubtitleSync` hook | Poll + match active cue |

### Phase 5: Integration + Polish (Day 4-5)

| Step | Task | Output |
|------|------|--------|
| 5.1 | End-to-end flow test | Paste URL → see subtitles → highlights work |
| 5.2 | Error state UI | "No captions" message, loading states |
| 5.3 | Empty state UI | Initial state with instructions |
| 5.4 | Unit tests for all services | vitest suite green |
| 5.5 | E2E tests for happy path + errors | Playwright suite green |

### Build Order Rationale

```
Scaffold → DB → Backend → Frontend → Integration
```

- **DB first** because both backend and frontend depend on the schema shape.
- **Backend before frontend** because the frontend needs a working API to develop against.
- **Integration last** because it depends on both sides being complete.
- Each phase produces a testable artifact — nothing is left "half-built."

---

## 11. Decision Record

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| **yt-dlp for subtitle extraction** | YouTube Data API v3 captions endpoint requires video ownership (403 for arbitrary videos). yt-dlp works on ANY public video, no API key, battle-tested. | YouTube Data API v3 (rejected: 403 for non-owned videos), youtube-captions-scraper npm (rejected: unmaintained, breaks frequently) |
| **Modular monolith (NestJS)** | Greenfield + small team. Microservices overhead unjustified. NestJS modules enforce boundaries; extract later if needed. | Microservices (rejected: premature complexity), plain Express (rejected: no built-in DI or module system) |
| **Drizzle ORM** | Type-safe, lightweight, SQL-like API. No decorator overhead like TypeORM. Excellent Postgres support. | TypeORM (rejected: decorator-heavy, slower), Prisma (rejected: different paradigm, migration workflow less flexible), raw SQL (rejected: no type safety) |
| **Zod for validation** | Co-located with TypeScript types via `z.infer`. Single source of truth for API contracts. Used by both frontend and backend. | class-validator (rejected: decorator-based, separate from types), io-ts (rejected: less ergonomic), Joi (rejected: no type inference) |
| **VTT as subtitle format** | yt-dlp's default output. Simple text format, easy to parse. Timestamps are human-readable. | SRT (rejected: yt-dlp defaults to VTT, SRT parsing is slightly more complex), JSON (rejected: yt-dlp doesn't output JSON for subtitles) |
| **100ms polling for subtitle sync** | YouTube IFrame API has no event for "time changed." Polling `getCurrentTime()` is the only option. 100ms is smooth enough for subtitle transitions and cheap (in-memory read). | WebSocket real-time (rejected: overkill for client-side data), `onStateChange` event (rejected: only fires on play/pause, not on time progression) |
| **Postgres for Feature #1** | Requirements spec mandates it. Good JSON support if needed later. Drizzle has excellent Postgres adapter. | SQLite (rejected: spec says Postgres), MongoDB (rejected: relational data, spec says Postgres) |
| **No auth in Feature #1** | Feature #1 scope is MVP — single user, no accounts. Auth adds complexity that isn't needed yet. Defer to when multi-user is required. | JWT (deferred), session cookies (deferred), OAuth (deferred) |
| **packages/shared for Zod schemas** | Single source of truth for validation. Backend validates requests, frontend validates form input — both import from the same schemas. Prevents schema drift. | Duplicate schemas in each app (rejected: drift risk), shared JSON Schema (rejected: less ergonomic than Zod) |
| **child_process.execFile for yt-dlp** | Direct, no extra dependencies. Full control over args and timeout. yt-dlp is a CLI tool — execFile is the natural interface. | `ytdlp-nodejs` npm package (rejected: thin wrapper, adds dependency for minimal value), spawning via shell (rejected: shell injection risk with execFile being safer) |

---

## Appendix A: Environment Variables

```env
# Database
DATABASE_URL=postgresql://immersion:immersion@localhost:5432/immersion_dev

# yt-dlp
YTDLP_PATH=/usr/bin/yt-dlp
YTDLP_TIMEOUT_MS=30000

# App
API_PORT=3001
WEB_PORT=5173
CORS_ORIGIN=http://localhost:5173
```

## Appendix B: Justfile Recipes

```justfile
# Justfile — quick commands

# Development
dev:
  podman-compose up -d
  just db:migrate
  just dev:api & just dev:web

dev:api:
  cd apps/api && pnpm dev

dev:web:
  cd apps/web && pnpm dev

# Database
db:migrate:
  cd apps/api && pnpm drizzle-kit migrate

db:push:
  cd apps/api && pnpm drizzle-kit push

db:studio:
  cd apps/api && pnpm drizzle-kit studio

db:generate:
  cd apps/api && pnpm drizzle-kit generate

# Testing
test:
  pnpm -r run test

test:api:
  cd apps/api && pnpm test

test:web:
  cd apps/web && pnpm test

test:e2e:
  cd apps/web && pnpm exec playwright test

# Build
build:
  pnpm -r run build

# Lint
lint:
  pnpm -r run lint

# Install dependencies
install:
  pnpm install
```

## Appendix C: podman-compose.yaml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: immersion-postgres
    environment:
      POSTGRES_USER: immersion
      POSTGRES_PASSWORD: immersion
      POSTGRES_DB: immersion_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

---

*End of Architecture Specification*
