# Migration Scripts

This directory contains scripts to migrate data from the current MeiliSearch setup to Supabase.

## Prerequisites

1. **Supabase Project Setup**
   - Create a new Supabase project
   - Run the database schema from `supabase-schema.sql`
   - Enable pg_trgm extension (should be done by the schema)

2. **Environment Variables**
   Add these to your `.env` file:

   ```bash
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Dependencies**
   ```bash
   bun add dotenv
   ```

## Migration Order

Run the scripts in this exact order:

### 1. Migrate Episodes

```bash
node migration-scripts/migrate-episodes.js
```

This script:

- Reads `src/assets/episodes6.json`
- Imports episode metadata into the `episodes` table
- Extracts season information from episode codes
- Handles duplicates with upsert

### 2. Migrate Transcripts

```bash
node migration-scripts/migrate-transcripts.js
```

This script:

- Processes all JSON files in `src/assets/transcripts/`
- Links transcript lines to episodes via foreign key
- Imports all transcript lines into `transcript_lines` table
- Preserves the `edited` flag for compatibility

### 3. Verify Migration

```bash
node migration-scripts/verify-migration.js
```

This script:

- Checks data integrity
- Compares counts between source files and database
- Tests search functionality
- Reports any issues

## Features

- **Batch Processing**: Large datasets are processed in batches to avoid timeouts
- **Error Handling**: Failed items are logged but don't stop the migration
- **Progress Tracking**: Real-time progress updates during migration
- **Data Validation**: Filters out invalid entries before insertion
- **Verification**: Built-in verification steps to ensure data integrity

## Rollback

If you need to clear the migrated data:

```bash
# Clear all transcript lines
node migration-scripts/clear-data.js --transcripts

# Clear all episodes
node migration-scripts/clear-data.js --episodes

# Clear everything
node migration-scripts/clear-data.js --all
```

## Troubleshooting

### Common Issues

1. **"Episode not found" Error**
   - Make sure you ran `migrate-episodes.js` first
   - Check that episode codes match between files

2. **Permission Errors**
   - Verify your `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Make sure RLS policies allow the migration

3. **Timeout Errors**
   - Reduce batch sizes in the scripts
   - Check your network connection

### Performance Tips

- Run migrations during off-peak hours
- Consider temporarily disabling RLS during migration
- Monitor your Supabase project's resource usage

## Data Validation

The migration scripts include several validation steps:

- **File Format**: Ensures JSON files are valid and contain expected structure
- **Required Fields**: Checks for required fields (line text, speaker, time)
- **Data Types**: Validates data types match schema expectations
- **Foreign Keys**: Ensures episode references exist before inserting transcript lines

## Monitoring

Each script provides detailed output including:

- Progress indicators
- Error counts and details
- Success summaries
- Data verification results

Monitor the console output and check for any errors or warnings during migration.
