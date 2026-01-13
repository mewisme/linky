-- Create view to expand interest_tags array into full tag records
CREATE OR REPLACE VIEW user_details_with_tags AS
SELECT 
  ud.id,
  ud.user_id,
  ud.date_of_birth,
  ud.gender,
  ud.languages,
  ud.bio,
  ud.created_at,
  ud.updated_at,
  -- Expand interest_tags array into JSON array of full tag objects
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
FROM user_details ud;

-- Add comment
COMMENT ON VIEW user_details_with_tags IS 'View that expands user_details interest_tags UUID array into full tag objects with all details';
