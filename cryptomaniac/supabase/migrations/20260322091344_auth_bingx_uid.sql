-- ============================================================
-- Auth + BingX UID Access Control Migration
-- ============================================================

-- 1. Core user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  bingx_uid TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Allowed BingX UIDs table (admin-managed)
CREATE TABLE IF NOT EXISTS public.allowed_bingx_uids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project YouTube links table (for algotrading cards)
CREATE TABLE IF NOT EXISTS public.project_youtube_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_name TEXT NOT NULL UNIQUE,
  youtube_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_bingx_uid ON public.user_profiles(bingx_uid);
CREATE INDEX IF NOT EXISTS idx_allowed_bingx_uids_uid ON public.allowed_bingx_uids(uid);
CREATE INDEX IF NOT EXISTS idx_project_youtube_links_repo ON public.project_youtube_links(repo_name);

-- 5. Trigger function: auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, bingx_uid)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'bingx_uid', NULL)
  );
  RETURN NEW;
END;
$$;

-- 6. Function: validate and claim a BingX UID during registration
CREATE OR REPLACE FUNCTION public.claim_bingx_uid(p_uid TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed_id UUID;
  v_is_used BOOLEAN;
BEGIN
  -- Check if UID exists and is not used
  SELECT id, is_used INTO v_allowed_id, v_is_used
  FROM public.allowed_bingx_uids
  WHERE uid = p_uid
  LIMIT 1;

  IF v_allowed_id IS NULL THEN
    RETURN false; -- UID not in allowed list
  END IF;

  IF v_is_used THEN
    RETURN false; -- UID already claimed
  END IF;

  -- Mark UID as used
  UPDATE public.allowed_bingx_uids
  SET is_used = true, used_by = p_user_id
  WHERE id = v_allowed_id;

  -- Update user profile with bingx_uid
  UPDATE public.user_profiles
  SET bingx_uid = p_uid, updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- 7. Function: check if user has valid learning access
CREATE OR REPLACE FUNCTION public.has_learning_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = p_user_id
    AND up.bingx_uid IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.allowed_bingx_uids ab
      WHERE ab.uid = up.bingx_uid AND ab.is_used = true AND ab.used_by = p_user_id
    )
  )
$$;

-- 8. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_bingx_uids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_youtube_links ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies: user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 10. RLS Policies: allowed_bingx_uids (read-only for authenticated users to validate)
DROP POLICY IF EXISTS "authenticated_read_allowed_uids" ON public.allowed_bingx_uids;
CREATE POLICY "authenticated_read_allowed_uids"
ON public.allowed_bingx_uids
FOR SELECT
TO authenticated
USING (true);

-- 11. RLS Policies: project_youtube_links (public read)
DROP POLICY IF EXISTS "public_read_youtube_links" ON public.project_youtube_links;
CREATE POLICY "public_read_youtube_links"
ON public.project_youtube_links
FOR SELECT
TO public
USING (true);

-- 12. Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
