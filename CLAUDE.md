# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Seekers' Lounge" - a search engine for transcripts of the Teachers' Lounge podcast. Built with SvelteKit, TypeScript, and MeiliSearch hosted on AWS. The app allows users to search through podcast transcripts with faceted filtering by season and episode.

## Development Commands

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun check` - Type check with svelte-check
- `bun check:watch` - Type check in watch mode
- `bun lint` - Run prettier and eslint checks
- `bun format` - Format code with prettier
- `bun run test` - Run all tests
- `bun run test:unit` - Run unit tests with vitest
- `bun run test:coverage` - Run tests with coverage report
- `bun run test:watch` - Run tests in watch mode
- `bun run test:ui` - Run tests with vitest UI

## Project Structure

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── audio/          # Audio playback components
│   │   ├── auth/           # Authentication components
│   │   ├── episode/        # Episode-specific components
│   │   ├── search/         # Search interface components
│   │   └── ui/             # Generic UI components
│   ├── repositories/       # Data access layer
│   ├── services/          # Business logic services
│   ├── states/            # Svelte 5 runes state management
│   ├── stores/            # Traditional Svelte stores
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── routes/                # SvelteKit route pages
│   ├── api/              # API endpoints
│   ├── auth/             # Authentication pages
│   ├── ep/               # Episode detail pages
│   └── episodes/         # Episode list page
├── assets/               # Static data files
│   ├── transcripts/      # Episode transcript JSON files
│   └── episodes.json     # Episode metadata
└── static/               # Static assets (images, icons, etc.)
```

## Architecture

### Service Layer

- **SearchService** (`src/lib/services/SearchService.ts`) - Handles search operations with caching and validation
- **AudioService** (`src/lib/services/AudioService.ts`) - Manages audio playback functionality
- **ContextService** (`src/lib/services/ContextService.ts`) - Provides context management
- **SearchCache** (`src/lib/services/SearchCache.ts`) - Client-side caching for search results
- **SearchProviderFactory** (`src/lib/services/SearchProviderFactory.ts`) - Factory for search providers
- **EpisodeDataProcessor** (`src/lib/services/EpisodeDataProcessor.ts`) - Processes episode data

### State Management (Svelte 5 Runes)

- **SearchState** (`src/lib/states/SearchState.svelte.ts`) - Global search state using runes
- **FiltersState** (`src/lib/states/FiltersState.svelte.ts`) - Filter state management
- **Audio Store** (`src/lib/stores/audio.ts`) - Audio playback state
- **Auth Store** (`src/lib/stores/auth.ts`) - Authentication state

### Core Components

#### Search Components
- **SearchContainer** (`src/lib/components/search/SearchContainer.svelte`) - Main search interface wrapper
- **SearchInput** (`src/lib/components/search/SearchInput.svelte`) - Search query input
- **SearchResults** (`src/lib/components/search/SearchResults.svelte`) - Search results display
- **SearchHit** (`src/lib/components/search/SearchHit.svelte`) - Individual search result component
- **SearchFilters** (`src/lib/components/search/SearchFilters.svelte`) - Search filtering controls

#### Episode Components
- **EpisodeHeader** (`src/lib/components/episode/EpisodeHeader.svelte`) - Episode page header
- **EpisodeSearch** (`src/lib/components/episode/EpisodeSearch.svelte`) - Episode-specific search
- **VirtualTranscriptList** (`src/lib/components/episode/VirtualTranscriptList.svelte`) - Virtualized transcript display
- **TranscriptLine** (`src/lib/components/episode/TranscriptLine.svelte`) - Individual transcript line
- **TranscriptQualityBanner** (`src/lib/components/episode/TranscriptQualityBanner.svelte`) - Transcript quality indicator

#### Audio Components
- **AudioPlayer** (`src/lib/components/audio/AudioPlayer.svelte`) - Audio playback for transcript segments

#### UI Components
- **Button** (`src/lib/components/ui/Button.svelte`) - Reusable button component
- **LoadingSpinner** (`src/lib/components/ui/LoadingSpinner.svelte`) - Loading indicator
- **ErrorMessage** (`src/lib/components/ui/ErrorMessage.svelte`) - Error display component

### Data Layer

- **MeiliSearch Integration** - Search backend hosted at `https://ts.pcast.site/`
- **SearchRepository** (`src/lib/repositories/SearchRepository.ts`) - Abstraction layer for MeiliSearch API
- **Search API** (`src/routes/api/search/+server.ts`) - Server endpoint that queries MeiliSearch
- **Transcript Data** - JSON files in `src/assets/transcripts/` containing timestamped dialogue with structure:
  - `edited: true/false` - Indicates if transcript has been manually corrected
  - `speaker` - Speaker identification (corrected in some episodes like s01e01, generic in others)
  - `time` - Timestamp for audio synchronization
  - `line` - Transcript content
- **Episode Metadata** - `src/assets/episodes.json` and `src/assets/episodes6.json` contain episode information

### Authentication & Authorization

- **Supabase Integration** (`src/lib/supabase.ts`) - Authentication provider setup
- **AuthModal** (`src/lib/components/auth/AuthModal.svelte`) - Authentication modal component
- **Server Hooks** (`src/hooks.server.ts`) - Server-side authentication handling
- **Auth Routes** (`src/routes/auth/`) - Authentication callback handling

### Utilities & Types

- **Types** (`src/lib/types/`) - TypeScript interfaces organized by domain:
  - `search.ts` - Search-related types
  - `audio.ts` - Audio playback types
  - `episode.ts` - Episode and transcript types
  - `user.ts` - User authentication types
  - `common.ts` - Shared common types
- **Utils** (`src/lib/utils/`) - Utility functions:
  - `validation.ts` - Input validation functions
  - `cache.ts` - Caching utilities
  - `errors.ts` - Error handling utilities
  - `debounce.ts` - Debouncing utility
  - `speakerUtils.ts` - Speaker name processing

### Migration & Tooling

- **Migration Scripts** (`migration-scripts/`) - Database migration utilities
- **MeiliTools** (`meilitools.js`) - CLI tool for managing MeiliSearch data (import, update, cleanup)
- **Feature Flags** (`src/lib/flags.ts`) - Feature flag configuration

### Pages and Routes

- **Main Search** (`src/routes/+page.svelte`) - Primary search interface
- **Episode Pages** (`src/routes/ep/[id]/+page.svelte`) - Static pages displaying full episode transcripts
- **Episodes List** (`src/routes/episodes/+page.svelte`) - List of all available episodes
- **Auth Callback** (`src/routes/auth/callback/+page.svelte`) - Authentication callback handler

### Search Features

- Full-text search across transcript content
- Faceted filtering by season and episode
- "Edited lines only" filter for curated content
- Pagination with "Load more" functionality
- Random search suggestions
- Individual episode transcript viewing with browser search (Ctrl/Cmd+F)

### Environment Setup

- Requires `VITE_MEILI_KEY` environment variable for MeiliSearch API access
- Uses Vercel Analytics (configured via `VERCEL_ANALYTICS_ID`)
- Node.js >= 20.19.0 (specified in package.json engines)

## Package Manager

Uses bun exclusively. Always use `bun` or `bun run` commands, never npm or pnpm.
