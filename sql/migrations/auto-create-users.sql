-- Auto-create users in custom users table when they sign up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), -- Use username from metadata or email prefix
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user record on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create user record for existing authenticated users (one-time setup)
CREATE OR REPLACE FUNCTION public.create_user_if_not_exists()
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO current_user_email
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Check if user already exists in custom users table
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = current_user_id) THEN
    -- Create the user record
    INSERT INTO public.users (id, email, username, role)
    VALUES (
      current_user_id,
      current_user_email,
      split_part(current_user_email, '@', 1), -- Use email prefix as username
      'user'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_if_not_exists() TO authenticated;