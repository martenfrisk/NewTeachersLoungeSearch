# MeiliSearch to Supabase Migration Setup

## Overview

This document explains how to set up and use the feature flag system to migrate from MeiliSearch to Supabase while maintaining the ability to easily revert.

## Current Status

✅ **Complete**: Migration infrastructure is ready

- Feature flags implemented with Vercel's flags package
- Supabase search repository implemented
- SearchProviderFactory for switching between providers
- Database schema and migration scripts prepared
- Authentication system foundation laid

## Setup Instructions

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Supabase Configuration (required when using Supabase search)
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Feature Flags (optional for development)
FLAGS_SECRET=your_vercel_flags_secret
```

### 2. Feature Flags Available

The following feature flags control the migration:

#### `use-supabase-search`

- **Default**: `false` (uses MeiliSearch)
- **Purpose**: Switch the search backend from MeiliSearch to Supabase
- **Impact**: Changes which search repository is used for all search queries

#### `enable-user-auth`

- **Default**: `false` (authentication disabled)
- **Purpose**: Enable user login and authentication features
- **Impact**: Shows/hides auth UI components and enables Supabase auth

#### `show-edit-features`

- **Default**: `false` (editing disabled)
- **Purpose**: Display transcript editing UI components
- **Impact**: Shows edit buttons and editing interfaces (future feature)

### 3. Migration Process

#### Phase 1: Preparation (Complete)

- ✅ Install Supabase client and configure connection
- ✅ Create database schema (`supabase-schema.sql`)
- ✅ Implement `SupabaseSearchRepository`
- ✅ Set up feature flag infrastructure

#### Phase 2: Data Migration

1. **Set up Supabase project**:

   ```bash
   # Create a new Supabase project at https://supabase.com
   # Run the schema: supabase-schema.sql in SQL Editor
   # Get your project URL and keys from Settings > API
   ```

2. **Run data migration scripts**:

   ```bash
   # First migrate episodes
   node migration-scripts/migrate-episodes.js

   # Then migrate transcript data
   node migration-scripts/migrate-transcripts.js
   ```

3. **Verify migration**:
   - Check Supabase dashboard for data
   - Test search functionality with small queries

#### Phase 3: Testing with Feature Flags

1. **Enable Supabase search for testing**:

   ```javascript
   // In your browser console or via Vercel deployment
   document.cookie = 'vercel-flag-overrides=use-supabase-search:true; path=/';
   ```

2. **Compare results**:
   - Test the same searches with both backends
   - Verify search quality and performance
   - Check faceted filtering functionality

3. **Gradual rollout**:
   - Enable for specific users/sessions
   - Monitor for errors or performance issues
   - Collect user feedback

#### Phase 4: Full Migration

1. **Update flag defaults**:

   ```typescript
   // In src/lib/flags.ts
   export const useSupabaseSearch = flag<boolean>({
   	// ... other config
   	decide() {
   		return true; // Switch default to Supabase
   	}
   });
   ```

2. **Monitor and verify**:
   - Watch for any search-related errors
   - Ensure all features work correctly
   - Performance monitoring

3. **Cleanup** (optional):
   - Keep MeiliSearch running for a period as backup
   - Eventually remove MeiliSearch dependencies
   - Update documentation

### 4. Rollback Strategy

If issues arise, you can instantly revert:

1. **Via feature flag**:

   ```javascript
   // Reset the cookie to use MeiliSearch
   document.cookie = 'vercel-flag-overrides=use-supabase-search:false; path=/';
   ```

2. **Via code change**:

   ```typescript
   // In src/lib/flags.ts
   export const useSupabaseSearch = flag<boolean>({
   	// ... other config
   	decide() {
   		return false; // Revert to MeiliSearch
   	}
   });
   ```

3. **Emergency fallback**: The SearchProviderFactory automatically falls back to MeiliSearch if Supabase search fails.

### 5. Development Commands

```bash
# Start development server
bun dev

# Run type checking
bun run check

# Run linting
bun run lint

# Format code
bun run format

# Run tests
bun run test

# Build for production
bun run build
```

### 6. Architecture Notes

#### SearchProviderFactory

- `src/lib/services/SearchProviderFactory.ts`
- Dynamically switches between MeiliSearch and Supabase based on feature flags
- Maintains singleton instances for performance
- Supports testing with mock repositories

#### Feature Flag Integration

- `src/lib/flags.ts` - Flag definitions
- `src/hooks.server.ts` - Server-side flag handling
- `src/lib/services/SearchProviderFactory.ts` - Uses flags to switch providers

#### Future Features Ready

- User authentication system prepared
- Transcript editing infrastructure planned (see `FUTURE_EDIT_FEATURES.md`)
- Role-based permissions framework ready

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Ensure all environment variables are set
2. **Supabase connection errors**: Verify URL and keys in environment
3. **Flag not working**: Check that `FLAGS_SECRET` is set and `hooks.server.ts` is configured
4. **Migration script errors**: Ensure Supabase schema is applied first

### Performance Considerations

- Supabase pg_trgm search may be slower than MeiliSearch for large datasets
- Consider implementing caching for frequently searched terms
- Monitor database connection limits during high traffic

### Security Notes

- Supabase Row Level Security (RLS) is enabled by default
- Service role key should only be used in migration scripts
- Feature flags can be used to gradually roll out auth features

## Next Steps

1. Set up Supabase project and run migrations
2. Test search functionality with feature flags
3. Plan rollout strategy (gradual vs immediate)
4. Monitor performance and user feedback
5. Consider implementing future edit features when ready

This migration maintains full backward compatibility and provides multiple safety nets for a smooth transition.
