  -- Rename user_details_with_tags to user_details_expanded (shorter name)
  ALTER VIEW IF EXISTS user_details_with_tags RENAME TO user_details_expanded;

  -- Create view that combines users with their expanded details
  -- This view provides a complete user profile with all details in one query
  CREATE OR REPLACE VIEW users_with_details AS
  SELECT 
    u.id,
    u.clerk_user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.country,
    u.role,
    u.allow,
    u.created_at AS user_created_at,
    u.updated_at AS user_updated_at,
    -- User details fields
    ud.id AS details_id,
    ud.date_of_birth,
    ud.gender,
    ud.languages,
    ud.bio,
    ud.created_at AS details_created_at,
    ud.updated_at AS details_updated_at,
    -- Expanded interest tags as JSON array
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', it.id,
            'name', it.name,
            'description', it.description,
            'icon', it.icon,
            'category', it.category,
            'is_active', it.is_active,
            'created_at', it.created_at,
            'updated_at', it.updated_at
          ) ORDER BY it.name
        )
        FROM interest_tags it
        WHERE it.id = ANY(ud.interest_tags)
          AND it.is_active = true
      ),
      '[]'::json
    ) AS interest_tags
  FROM users u
  LEFT JOIN user_details ud ON u.id = ud.user_id;

  -- Add comments
  COMMENT ON VIEW user_details_expanded IS 'User details with expanded interest tags as JSON array';
  COMMENT ON VIEW users_with_details IS 'Complete user profile combining users table with expanded user details and interest tags';
