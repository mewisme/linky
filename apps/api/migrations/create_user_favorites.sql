CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  favorite_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_favorites_unique UNIQUE (user_id, favorite_user_id),
  CONSTRAINT user_favorites_not_self CHECK (user_id != favorite_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_favorite_user_id ON user_favorites(favorite_user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

COMMENT ON TABLE user_favorites IS 'Stores unilateral favorite relationships between users';
COMMENT ON COLUMN user_favorites.user_id IS 'The user who is marking someone as favorite';
COMMENT ON COLUMN user_favorites.favorite_user_id IS 'The user being marked as favorite';
