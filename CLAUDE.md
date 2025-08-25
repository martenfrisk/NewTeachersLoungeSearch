# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Seekers' Lounge" - a search engine for transcripts of the Teachers' Lounge podcast. Built with SvelteKit, TypeScript, and MeiliSearch hosted on AWS. The app allows users to search through podcast transcripts with faceted filtering by season and episode.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production  
- `pnpm preview` - Preview production build
- `pnpm check` - Type check with svelte-check
- `pnpm check:watch` - Type check in watch mode
- `pnpm lint` - Run prettier and eslint checks
- `pnpm format` - Format code with prettier

## Architecture

### Core Components
- **Search.svelte** (`src/lib/Search.svelte`) - Main search interface with query input, filters, and results display
- **Hit.svelte** (`src/lib/components/Hit.svelte`) - Individual search result component
- **AudioPlayer.svelte** (`src/lib/components/AudioPlayer.svelte`) - Audio playback for transcript segments

### Data Layer
- **MeiliSearch Integration** - Search backend hosted at `https://ts.pcast.site/`
- **Search API** (`src/routes/api/search/+server.ts`) - Server endpoint that queries MeiliSearch
- **Transcript Data** - JSON files in `src/assets/transcripts/` containing timestamped dialogue
- **Episode Metadata** - `src/assets/episodes6.json` contains episode information

### Key Files
- `src/lib/utils.ts` - Core search functions (`searchMeili`), MeiliSearch client, utility functions
- `src/lib/types.d.ts` - TypeScript interfaces for search results, hits, episodes
- `meilitools.js` - CLI tool for managing MeiliSearch data (import, update, cleanup)

### Search Features
- Full-text search across transcript content
- Faceted filtering by season and episode
- "Edited lines only" filter for curated content
- Pagination with "Load more" functionality
- Random search suggestions

### Environment Setup
- Requires `VITE_MEILI_KEY` environment variable for MeiliSearch API access
- Uses Vercel Analytics (configured via `VERCEL_ANALYTICS_ID`)

## Package Manager

Uses pnpm (specified in package.json with `packageManager` field).