-- Create user_details table to store detailed user information for personalized filters
CREATE TABLE IF NOT EXISTS user_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  date_of_birth DATE,
  gender VARCHAR(20),
  languages TEXT[],
  interest_tags UUID[],
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_details_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT check_age CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_details_user_id ON user_details(user_id);
CREATE INDEX IF NOT EXISTS idx_user_details_gender ON user_details(gender);
CREATE INDEX IF NOT EXISTS idx_user_details_languages ON user_details USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_user_details_interest_tags ON user_details USING GIN(interest_tags);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_details_updated_at
  BEFORE UPDATE ON user_details
  FOR EACH ROW
  EXECUTE FUNCTION update_user_details_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE user_details IS 'Stores detailed user information for personalized filters and matching';
COMMENT ON COLUMN user_details.user_id IS 'Foreign key reference to users table (one-to-one relationship)';
COMMENT ON COLUMN user_details.date_of_birth IS 'User date of birth for age calculation';
COMMENT ON COLUMN user_details.gender IS 'User gender';
COMMENT ON COLUMN user_details.languages IS 'Array of languages the user speaks';
COMMENT ON COLUMN user_details.interest_tags IS 'Array of interest tag IDs (UUID) referencing interest_tags table';
COMMENT ON COLUMN user_details.bio IS 'User biography or description';
