-- Serves the unread badge count (recipient + read = false) and the scoped
-- markAsRead update. Standalone file for the same CONCURRENTLY pipeline
-- constraint documented in the previous migration.
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_recipient_unread_idx
    ON "public"."notifications" (recipient)
    WHERE read = false;
