-- Create table to temporarily store OAuth session data
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whop_org_id TEXT NOT NULL,
  whop_email TEXT,
  whop_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS oauth_sessions_id_idx ON oauth_sessions(id);

-- Add RLS policies
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (needed for unauthenticated OAuth flow)
CREATE POLICY "Allow insert oauth_sessions" ON oauth_sessions
  FOR INSERT WITH CHECK (true);

-- Allow anyone to select their own session
CREATE POLICY "Allow select oauth_sessions" ON oauth_sessions
  FOR SELECT USING (true);

-- Auto-delete expired sessions
CREATE OR REPLACE FUNCTION delete_expired_oauth_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
