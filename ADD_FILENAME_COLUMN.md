# How to Add the Filename Column to Supabase

The commit functionality is failing because the `commits` table doesn't have a `filename` column yet. Follow these steps to add it:

## Option 1: Supabase Dashboard (Easiest)

1. Go to https://app.supabase.com
2. Sign in and select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste this SQL:

```sql
ALTER TABLE commits 
ADD COLUMN IF NOT EXISTS filename VARCHAR(500) DEFAULT 'unknown.txt';
```

6. Click **Run** (or press Cmd+Enter)
7. You should see "Success" message

## Option 2: PostgreSQL CLI

If you have `psql` installed:

```bash
# Connect to your Supabase database
psql postgresql://postgres.[your-project-id]:[your-password]@db.[region].supabase.co:5432/postgres

# Run the migration
ALTER TABLE commits 
ADD COLUMN IF NOT EXISTS filename VARCHAR(500) DEFAULT 'unknown.txt';
```

## Option 3: Backend Auto-Migration (Already Applied)

The backend has been updated to gracefully handle the missing column. However, for the feature to work fully, you still need to add the column.

## After Migration

Once you add the column:
1. Restart your backend: `npm start` in the backend folder
2. Create a new commit in the IDE
3. The dashboard should now show:
   - Commit message ✅
   - Filename (e.g., "app.tsx") ✅
   - Author name ✅
   - Relative time (e.g., "2 hours ago") ✅

## Verification

After running the migration, verify the column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'commits'
ORDER BY ordinal_position;
```

You should see `filename` in the list with type `character varying(500)`.
