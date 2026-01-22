-- Create function to increment user experience points
CREATE OR REPLACE FUNCTION increment_user_exp(p_user_id UUID, p_seconds BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_levels (user_id, total_exp_seconds)
  VALUES (p_user_id, p_seconds)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_exp_seconds = user_levels.total_exp_seconds + p_seconds;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_user_exp(UUID, BIGINT) IS 'Increments user experience points by adding seconds. Creates row if missing.';

-- Create function to upsert user streak day
CREATE OR REPLACE FUNCTION upsert_user_streak_day(
  p_user_id UUID,
  p_date DATE,
  p_total_call_seconds INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  v_is_valid := p_total_call_seconds >= 300;
  
  INSERT INTO user_streak_days (user_id, date, total_call_seconds, is_valid)
  VALUES (p_user_id, p_date, p_total_call_seconds, v_is_valid)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_call_seconds = user_streak_days.total_call_seconds + p_total_call_seconds,
    is_valid = (user_streak_days.total_call_seconds + p_total_call_seconds) >= 300;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_user_streak_day(UUID, DATE, INTEGER) IS 'Upserts daily streak record. Marks is_valid if total >= 300 seconds. Accumulates seconds if record exists.';

-- Create function to update user streak summary
CREATE OR REPLACE FUNCTION update_user_streak_summary(
  p_user_id UUID,
  p_date DATE,
  p_is_valid BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  v_existing_summary RECORD;
  v_new_current_streak INTEGER;
  v_new_longest_streak INTEGER;
BEGIN
  SELECT current_streak, longest_streak, last_valid_date
  INTO v_existing_summary
  FROM user_streaks
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    IF p_is_valid THEN
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_valid_date)
      VALUES (p_user_id, 1, 1, p_date);
    ELSE
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_valid_date)
      VALUES (p_user_id, 0, 0, NULL);
    END IF;
    RETURN;
  END IF;
  
  IF NOT p_is_valid THEN
    UPDATE user_streaks
    SET current_streak = 0,
        last_valid_date = NULL
    WHERE user_id = p_user_id;
    RETURN;
  END IF;
  
  IF v_existing_summary.last_valid_date IS NULL THEN
    v_new_current_streak := 1;
  ELSIF v_existing_summary.last_valid_date = p_date - INTERVAL '1 day' THEN
    v_new_current_streak := v_existing_summary.current_streak + 1;
  ELSE
    v_new_current_streak := 1;
  END IF;
  
  v_new_longest_streak := GREATEST(v_existing_summary.longest_streak, v_new_current_streak);
  
  UPDATE user_streaks
  SET current_streak = v_new_current_streak,
      longest_streak = v_new_longest_streak,
      last_valid_date = p_date
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_streak_summary(UUID, DATE, BOOLEAN) IS 'Updates user streak summary. Handles increment/reset logic based on consecutive valid days.';

-- Create trigger function to auto-update streak summary after streak day insert/update
CREATE OR REPLACE FUNCTION trigger_update_streak_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_streak_summary(NEW.user_id, NEW.date, NEW.is_valid);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_update_streak_summary() IS 'Trigger function to automatically update streak summary when streak day is inserted or updated';

-- Create trigger to auto-update streak summary
CREATE TRIGGER trigger_user_streak_days_update_summary
  AFTER INSERT OR UPDATE OF is_valid, total_call_seconds ON user_streak_days
  FOR EACH ROW
  WHEN (NEW.is_valid = true)
  EXECUTE FUNCTION trigger_update_streak_summary();
