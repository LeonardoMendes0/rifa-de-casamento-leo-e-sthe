
-- 1) Lock down raffle_numbers: remove anon full-row access
DROP POLICY IF EXISTS "public read raffle numbers" ON public.raffle_numbers;
REVOKE SELECT ON public.raffle_numbers FROM anon;
GRANT SELECT ON public.raffle_numbers TO authenticated;
GRANT ALL ON public.raffle_numbers TO service_role;

-- Only admins can read full rows (with buyer PII)
CREATE POLICY "Admins read raffle numbers"
  ON public.raffle_numbers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Public-safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.raffle_numbers_public
WITH (security_invoker = false) AS
SELECT number, status, payment_id
FROM public.raffle_numbers;

GRANT SELECT ON public.raffle_numbers_public TO anon, authenticated;

-- 3) has_role: switch to SECURITY INVOKER (user_roles RLS already scopes to self)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- has_role must remain callable by authenticated users (used inside RLS policies)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 4) release_expired_reservations: restrict to service_role only (cron uses it)
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
