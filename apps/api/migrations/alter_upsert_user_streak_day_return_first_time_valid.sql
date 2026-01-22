CREATE OR REPLACE FUNCTION upsert_user_streak_day(
  p_user_id UUID,
  p_date DATE,
  p_total_call_seconds INTEGER
)
RETURNS TABLE(first_time_valid BOOLEAN, current_streak INTEGER) AS $$
DECLARE
  v_old_valid BOOLEAN := false;
  v_old_total INTEGER := 0;
  v_new_total INTEGER;
  v_is_valid BOOLEAN;
  v_found BOOLEAN := false;
  v_streak INTEGER := 0;
BEGIN
  SELECT is_valid, total_call_seconds INTO v_old_valid, v_old_total
  FROM user_streak_days
  WHERE user_id = p_user_id AND date = p_date;

  v_found := FOUND;
  IF NOT FOUND THEN
    v_old_valid := false;
    v_old_total := 0;
  END IF;
  v_new_total := v_old_total + p_total_call_seconds;
  v_is_valid := v_new_total >= 300;

  INSERT INTO user_streak_days (user_id, date, total_call_seconds, is_valid)
  VALUES (p_user_id, p_date, p_total_call_seconds, v_is_valid)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_call_seconds = user_streak_days.total_call_seconds + p_total_call_seconds,
    is_valid = (user_streak_days.total_call_seconds + p_total_call_seconds) >= 300;

  first_time_valid := (NOT v_found OR NOT v_old_valid) AND v_is_valid;

  IF first_time_valid OR v_is_valid THEN
    SELECT s.current_streak INTO v_streak
    FROM user_streaks s
    WHERE s.user_id = p_user_id;
    current_streak := COALESCE(v_streak, 0);
  ELSE
    current_streak := 0;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
