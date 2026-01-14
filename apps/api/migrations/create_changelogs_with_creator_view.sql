-- Create view for changelogs with creator user information
-- This view replaces created_by (UUID) with full user information from users table
CREATE OR REPLACE VIEW changelogs_with_creator AS
SELECT 
  c.id,
  c.version,
  c.title,
  c.release_date,
  c.s3_key,
  c.is_published,
  c."order",
  c.created_at,
  c.updated_at,
  -- Creator user information (replaces created_by UUID)
  json_build_object(
    'id', u.id,
    'clerk_user_id', u.clerk_user_id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'avatar_url', u.avatar_url,
    'country', u.country,
    'role', u.role,
    'allow', u.allow,
    'created_at', u.created_at,
    'updated_at', u.updated_at
  ) AS created_by
FROM changelogs c
LEFT JOIN users u ON c.created_by = u.id;

-- Add comment
COMMENT ON VIEW changelogs_with_creator IS 'Changelogs view with creator user information expanded from users table instead of just created_by UUID';
