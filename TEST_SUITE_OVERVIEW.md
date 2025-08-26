# Test Suite Overview - Seekers' Lounge

This comprehensive test suite follows TDD principles and focuses on testing expected behavior rather than current implementation details.

## Test Structure

### Unit Tests (Server Environment)

Located in: `src/lib/**/*.test.ts`

- **Utils Tests** (`src/lib/utils.test.ts`)
  - Tests search utility functions (debounce, highlight, time formatting)
  - Tests MeiliSearch client functions
  - Tests URL parameter helpers and random query functions

- **Service Layer Tests**
  - **SearchService** (`src/lib/services/SearchService.test.ts`)
    - Tests search functionality with caching behavior
    - Tests pagination and "search more" features
    - Tests error handling and validation workflows
  - **AudioService** (`src/lib/services/AudioService.test.ts`)
    - Tests audio playback controls (play, pause, seek)
    - Tests timestamp conversion and RSS feed parsing
    - Tests episode finding and error handling

- **Repository Tests** (`src/lib/repositories/SearchRepository.test.ts`)
  - Tests MeiliSearchRepository with mocked responses
  - Tests filter processing and facet handling
  - Tests error handling for network issues

- **Validation Tests** (`src/lib/utils/validation.test.ts`)
  - Tests search query validation and sanitization
  - Tests parameter validation with edge cases
  - Tests email and timestamp validation

- **Store Tests** (`src/lib/stores/audio.test.ts`)
  - Tests state management for audio playbook
  - Tests derived stores for progress and time formatting
  - Tests store actions and reactivity

### Component Tests (Browser Environment)

Located in: `src/lib/components/**/*.svelte.test.ts`

- **AudioPlayer Component** (`src/lib/components/audio/AudioPlayer.svelte.test.ts`)
  - Tests play/pause controls and volume controls
  - Tests progress bar interactions and time formatting
  - Tests accessibility and keyboard navigation

- **SearchHit Component** (`src/lib/components/search/SearchHit.svelte.test.ts`)
  - Tests hit rendering with formatted content
  - Tests context loading and display behavior
  - Tests audio play button functionality
  - Tests speaker name formatting

### API Route Tests

Located in: `src/routes/**/*.test.ts`

- **Search API** (`src/routes/api/search/+server.test.ts`)
  - Tests GET endpoint with various query parameters
  - Tests error handling and validation
  - Tests caching headers and response format

### Integration Tests

Located in: `src/lib/__tests__/integration/`

- **Search Flow** (`src/lib/__tests__/integration/search-flow.test.ts`)
  - Tests complete search workflow from query to results
  - Tests filter interactions and faceted search
  - Tests audio playback integration
  - Tests user experience workflows

## Test Utilities and Mocks

Located in: `src/lib/__tests__/`

- **Test Helpers** (`src/lib/__tests__/utils/test-helpers.ts`)
  - Factory functions for creating mock data
  - Utility functions for async testing
  - Assertion helpers

- **Mocks**
  - MeiliSearch client mock (`src/lib/__tests__/mocks/meilisearch.ts`)
  - DOM API mocks (`src/lib/__tests__/mocks/dom.ts`)
  - Audio element mock implementations

- **Setup** (`src/lib/__tests__/setup.ts`)
  - Global test configuration
  - Mock environment setup
  - SvelteKit module mocks

## Test Principles Applied

### TDD Focus on Behavior

- Tests describe expected user workflows and system behavior
- Tests validate business requirements rather than implementation details
- Error scenarios test expected error handling behavior

### Test Categories by Purpose

#### 1. **Behavioral Tests**

Tests that verify the system does what users expect:

- Search returns relevant results in correct format
- Audio playback works seamlessly from search results
- Filters narrow results while maintaining navigation options
- Pagination loads more results without duplicates

#### 2. **Quality Tests**

Tests that verify the system maintains quality standards:

- Input validation prevents invalid requests
- Error handling provides meaningful feedback
- Caching improves performance without serving stale data
- Accessibility features work correctly

#### 3. **Integration Tests**

Tests that verify components work together correctly:

- Complete discovery-to-listening workflow
- Search context maintained across interactions
- Audio and search functionality integrated properly

## Running Tests

```bash
# Run all tests
bun test

# Run unit tests only (server environment)
bun test:unit -- --project=server

# Run component tests only (browser environment)
bun test:unit -- --project=client

# Run tests in watch mode
bun test:unit -- --watch

# Run integration tests
bun test src/lib/__tests__/integration/

# Run tests with coverage
bun test -- --coverage
```

## Test Coverage Goals

The test suite aims to cover:

- **Business Logic**: 100% of search, audio, and validation logic
- **User Workflows**: All primary user journeys from search to playback
- **Error Scenarios**: All expected error conditions and edge cases
- **API Contracts**: All endpoints and their expected behavior
- **Component Behavior**: All interactive elements and state changes

## Key Testing Patterns

### 1. **Factory Pattern for Test Data**

```typescript
const mockHit = createMockSearchHit({
	episode: '101.json',
	time: '00:10:30',
	edited: true
});
```

### 2. **Behavior-Driven Assertions**

```typescript
// BEHAVIOR: User searches and expects relevant results
const result = await searchService.search('test query');
expect(result.items).toEqual(
	expect.arrayContaining([
		expect.objectContaining({
			_formatted: expect.objectContaining({
				line: expect.stringContaining('<em>') // Should highlight terms
			})
		})
	])
);
```

### 3. **Integration Workflow Testing**

```typescript
// BEHAVIOR: Complete user workflow from discovery to listening
const searchResult = await searchService.search('interesting topic');
const selectedHit = searchResult.items[0];
await audioService.playTimestamp({
	timestamp: selectedHit.time,
	episode: selectedHit.episode
});
// Test verifies the complete workflow succeeds
```

This test suite provides comprehensive coverage while maintaining focus on expected behavior and user experience.
