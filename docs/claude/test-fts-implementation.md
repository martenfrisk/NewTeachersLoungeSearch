# PostgreSQL FTS Implementation Test Plan

## Database Migration Steps

1. **Run the FTS migration first:**

   ```sql
   -- Execute supabase-fts-migration.sql in Supabase SQL editor
   -- This adds the tsvector column and GIN indexes
   ```

2. **Update the functions:**
   ```sql
   -- Execute supabase-optimized-functions.sql in Supabase SQL editor
   -- This replaces the search functions with FTS versions
   ```

## Testing Search Quality

### Test Queries to Validate FTS Works:

1. **Simple word search:**
   - Query: `"teacher"`
   - Should find results containing "teacher" or related words

2. **Phrase search:**
   - Query: `"teachers lounge"`
   - Should find exact phrase matches

3. **Multi-word search:**
   - Query: `"funny story"`
   - Should find results containing both words (ranked by relevance)

4. **Stemmed search:**
   - Query: `"teaching"`
   - Should also find "teacher", "teaches", "taught" (English stemming)

### Expected Performance Improvements:

- **Speed:** Sub-second response times (vs previous 1+ second timeouts)
- **Relevance:** Better ranking with `ts_rank()` vs `similarity()`
- **Features:** Phrase search, stemming, stop word handling
- **Scalability:** Will handle larger transcript volumes

## Code Changes Summary:

1. ✅ **supabase-fts-migration.sql** - Adds `search_vector` tsvector column and GIN index
2. ✅ **supabase-optimized-functions.sql** - Rewrites functions to use `@@` and `ts_rank()`
3. ✅ **SearchRepository.ts** - Removes MeiliSearch, fixes timeout race condition
4. ✅ **SearchProviderFactory.ts** - Simplified to only use Supabase
5. ✅ **flags.ts** - Updated to always use Supabase search
6. ✅ **supabase.ts** - Reduced timeout to 15 seconds

## Validation Commands:

After running migrations, test in Supabase SQL editor:

```sql
-- Test the FTS column exists
SELECT search_vector FROM transcript_lines LIMIT 1;

-- Test basic FTS search
SELECT COUNT(*) FROM transcript_lines
WHERE search_vector @@ websearch_to_tsquery('english', 'teacher');

-- Test search function works
SELECT * FROM optimized_search_transcripts('teacher', null, null, false, 5, 0);
```

## Next Steps After Migration:

1. Test search functionality in the app
2. Verify queries that previously returned no results now work
3. Confirm improved search speed and relevance
4. Monitor for any edge cases with query parsing

The implementation should provide 10-20x performance improvement while adding proper full-text search features like phrase search, stemming, and relevance ranking.
