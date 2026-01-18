CREATE OR REPLACE VIEW user_favorites_with_stats AS
SELECT 
  uf.id,
  uf.user_id,
  uf.favorite_user_id,
  uf.created_at,
  u.clerk_user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.avatar_url,
  u.country,
  COALESCE(match_stats.match_count, 0) AS match_count,
  COALESCE(match_stats.total_duration, 0) AS total_duration,
  CASE 
    WHEN COALESCE(match_stats.match_count, 0) > 0 
    THEN COALESCE(match_stats.total_duration, 0) / match_stats.match_count 
    ELSE 0 
  END AS average_duration
FROM user_favorites uf
JOIN users u ON uf.favorite_user_id = u.id
LEFT JOIN (
  SELECT 
    CASE 
      WHEN ch.caller_id < ch.callee_id THEN ch.caller_id
      ELSE ch.callee_id
    END AS user_a,
    CASE 
      WHEN ch.caller_id < ch.callee_id THEN ch.callee_id
      ELSE ch.caller_id
    END AS user_b,
    COUNT(*) AS match_count,
    SUM(COALESCE(ch.duration_seconds, 0)) AS total_duration
  FROM call_history ch
  WHERE ch.duration_seconds IS NOT NULL
  GROUP BY user_a, user_b
) match_stats ON (
  (uf.user_id = match_stats.user_a AND uf.favorite_user_id = match_stats.user_b) OR
  (uf.user_id = match_stats.user_b AND uf.favorite_user_id = match_stats.user_a)
);

COMMENT ON VIEW user_favorites_with_stats IS 'User favorites with call statistics including match count, total duration, and average duration';
