-- Create function to automatically create user_details when a new user is created
CREATE OR REPLACE FUNCTION create_user_details_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user_details record with the new user's ID
  INSERT INTO user_details (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_details already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create user_details after user insert
CREATE TRIGGER trigger_create_user_details_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_details_on_user_insert();

-- Add comment
COMMENT ON FUNCTION create_user_details_on_user_insert() IS 'Automatically creates a user_details record when a new user is inserted into the users table';
