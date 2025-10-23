# Database Migration: Adding Prefilled URL Support

This migration adds the `prefilled_url` field to the `voters` table to store voting URLs for easy distribution and tracking.

## What This Migration Does

1. **Adds `prefilled_url` column** to the `voters` table
2. **Generates prefilled URLs** for existing voters
3. **Updates voter import process** to automatically generate URLs for new voters
4. **Updates admin interface** to display and export stored URLs

## Running the Migration

### Prerequisites

1. Make sure your database is running
2. Ensure the `DATABASE_URL` environment variable is set
3. Set the `CLIENT_URL` environment variable to your frontend URL (e.g., `http://localhost:3000` or `https://yourdomain.com`)

### Run the Migration

```bash
cd apps/api
node add-prefilled-url-column.js
```

### Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
DATABASE_URL=your_database_connection_string
CLIENT_URL=http://localhost:3000  # or your production domain
```

## What Happens After Migration

### For New Voters
- When you import voters via CSV, prefilled URLs are automatically generated and stored
- URLs are immediately available in the admin interface

### For Existing Voters
- Prefilled URLs are generated and stored in the database
- URLs are available immediately in the admin interface

### Admin Interface Updates
- **Copy Link button**: Copy individual voting URLs
- **Copy All URLs button**: Copy all unused voting URLs at once
- **Export URLs button**: Download CSV with all voting URLs
- **Voters table**: Now displays stored URLs instead of generating them on-the-fly

### CSV Export Updates
- Downloaded voter CSV files now include the `prefilled_url` column
- URLs are ready to use for voter distribution

## Benefits

1. **Persistent URLs**: URLs are stored in the database and don't change
2. **Better Performance**: No need to generate URLs on-the-fly
3. **Easier Distribution**: URLs are ready to copy/export immediately
4. **Better Tracking**: URLs are consistent and can be tracked over time
5. **Backup Ready**: URLs are preserved even if the system is restarted

## Troubleshooting

### Migration Fails
- Check that `DATABASE_URL` is correctly set
- Ensure database is accessible
- Check database permissions

### URLs Not Generated
- Verify `CLIENT_URL` environment variable is set
- Check that the base URL is correct for your environment
- Ensure the migration completed successfully

### Frontend Issues
- Clear browser cache after migration
- Restart the frontend application
- Check that the API is returning the new `prefilled_url` field

## Rollback (if needed)

If you need to rollback this migration:

```sql
ALTER TABLE voters DROP COLUMN IF EXISTS prefilled_url;
```

**Note**: This will remove all stored prefilled URLs. You'll need to regenerate them if you want to re-enable the feature.
