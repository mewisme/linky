CREATE OR REPLACE VIEW public_user_info AS
SELECT 
  u.id,
  u.avatar_url,
  u.first_name,
  u.last_name,
  ud.date_of_birth,
  ud.gender,
  ud.bio,
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

COMMENT ON VIEW public_user_info IS 'Public user information view with expanded interest tags for user matching and display';