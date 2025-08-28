# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Seekers' Lounge" - a search engine for transcripts of the Teachers' Lounge podcast. Built with SvelteKit, TypeScript, and Supabase (PostgreSQL) with full-text search. The app allows users to search through podcast transcripts with faceted filtering by season and episode.

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
- **SearchProviderFactory** (`src/lib/services/SearchProviderFactory.ts`) - Factory for search providers
- **EpisodeDataProcessor** (`src/lib/services/EpisodeDataProcessor.ts`) - Processes episode data

# (rest of the file remains unchanged)

- don't use mcp-tool-executor
