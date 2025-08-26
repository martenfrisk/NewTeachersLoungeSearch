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

## Architecture

### Service Layer

- **SearchService** (`src/lib/services/SearchService.ts`) - Handles search operations with caching and validation
- **AudioService** (`src/lib/services/AudioService.ts`) - Manages audio playback functionality
- **ContextService** (`src/lib/services/ContextService.ts`) - Provides context management

### State Management (Svelte 5 Runes)

- **SearchState** (`src/lib/states/SearchState.svelte.ts`) - Global search state using runes
- **FiltersState** (`src/lib/states/FiltersState.svelte.ts`) - Filter state management
- **Audio Store** (`src/lib/stores/audio.ts`) - Audio playback state

### Core Components

- **SearchContainer** (`src/lib/components/search/SearchContainer.svelte`) - Main search interface wrapper
- **SearchInput** (`src/lib/components/search/SearchInput.svelte`) - Search query input
- **SearchResults** (`src/lib/components/search/SearchResults.svelte`) - Search results display
- **SearchHit** (`src/lib/components/search/SearchHit.svelte`) - Individual search result component
- **AudioPlayer** (`src/lib/components/audio/AudioPlayer.svelte`) - Audio playback for transcript segments

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

### Key Files

- `src/lib/types/` - TypeScript interfaces organized by domain (search, audio, episode, etc.)
- `src/lib/utils/` - Utility functions including cache, validation, and error handling
- `meilitools.js` - CLI tool for managing MeiliSearch data (import, update, cleanup)

### Pages and Routes

- **Episode Pages** (`src/routes/ep/[id]/+page.svelte`) - Static pages displaying full episode transcripts
- **Episodes List** (`src/routes/episodes/+page.svelte`) - List of all available episodes
- **Main Search** (`src/routes/+page.svelte`) - Primary search interface

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
