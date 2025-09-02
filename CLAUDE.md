# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Seekers' Lounge" - a search engine for transcripts of the Teachers' Lounge podcast. Built with SvelteKit 2, TypeScript, and Supabase (PostgreSQL) with full-text search using pg_trgm. Features user authentication, collaborative editing, and audio playback synchronization.

## Tech Stack

- **Frontend**: SvelteKit 2 with Svelte 5 (using runes for state management)
- **Backend**: Supabase (PostgreSQL with pg_trgm extension for fuzzy search)
- **Build Tool**: Vite with Bun package manager
- **Styling**: Tailwind CSS v4 
- **Audio**: WaveSurfer.js for waveform visualization
- **Testing**: Vitest with Playwright for browser tests
- **Deployment**: Vercel with adapter-vercel

## Development Commands

**Core Commands:**
- `bun dev` - Start development server
- `bun build` - Build for production (includes cache prebuild step)
- `bun preview` - Preview production build
- `bun check` - Type check with svelte-check
- `bun check:watch` - Type check in watch mode

**Code Quality:**
- `bun lint` - Run prettier and eslint checks
- `bun format` - Format code with prettier

**Testing:**
- `bun run test` - Run all tests
- `bun run test:unit` - Run server-side unit tests with vitest
- `bun run test:unit:client` - Run client-side/component tests with browser
- `bun run test:coverage` - Run tests with coverage report
- `bun run test:watch` - Run tests in watch mode
- `bun run test:ui` - Run tests with vitest UI

**Data Generation:**
- `bun run generate:static` - Generate static episode data files
- `bun run cache:prebuild` - Pre-warm search cache for build

## Architecture

### State Management Pattern

The app uses **Svelte 5 runes** for reactive state management:
- `states/` directory: Modern runes-based state (SearchState, FiltersState)
- `stores/` directory: Traditional Svelte stores for backward compatibility
- All new state should use runes pattern following `SearchState.svelte.ts`

### Service Layer Architecture

- **SearchService** - Core search with caching, validation, and query parsing
- **AudioService** - Audio playback with waveform synchronization
- **EditorService** - Transcript editing with version control
- **SearchProviderFactory** - Factory pattern for search backend switching
- **ModeratorService** - Content moderation and approval workflows

### Data Layer

**Database (Supabase PostgreSQL):**
- `episodes` - Episode metadata and audio information
- `transcript_lines` - Individual transcript lines with speakers/timestamps
- `users` - User authentication and roles
- `line_edits` - Version history for collaborative editing
- Uses pg_trgm extension for fuzzy text search

**Search Implementation:**
- PostgreSQL full-text search with pg_trgm for fuzzy matching
- Multi-layered caching (static cache + Edge Config + runtime cache)
- Query parsing supports advanced syntax (quotes, boolean operators)

### Component Architecture

**Modular Component Design:**
```
components/
├── audio/          # AudioPlayer, AudioWaveform, sync controls
├── auth/           # AuthModal with Supabase integration
├── editor/         # TranscriptEditor with real-time collaboration
├── episode/        # Episode cards, navigation, search results
├── search/         # Search UI with filters and hit highlighting
├── moderation/     # Content approval and diff viewing
└── ui/             # Reusable UI primitives (Button, Toast, etc.)
```

### Key Patterns

**Repository Pattern:**
- `repositories/SearchRepository.ts` - Abstract data access
- `repositories/EditorRepository.ts` - Editor-specific data operations

**Error Handling:**
- Centralized error handling via `utils/errors.ts`
- Error boundaries for React-like error catching in Svelte

**Testing Strategy:**
- Server-side logic: Standard Vitest unit tests
- Client components: Browser-based tests with Playwright
- Separate configs for server vs client testing

## Migration Context

**Current Migration:** MeiliSearch → Supabase (PostgreSQL)
- Migration scripts in `migration-scripts/` directory
- Database schema in `sql/schema/supabase-schema.sql`
- Full migration plan documented in `docs/claude/MIGRATION_PLAN.md`

## Development Guidelines

- Always use "bun run" commands, never npm
- Add "Type" suffix to all TypeScript type definitions
- Maintain CHANGELOG.md with all changes
- Use Svelte 5 runes for new state management
- Follow component modularity patterns
- Test both server and client code appropriately
- Don't use mcp-tool-executor agent
