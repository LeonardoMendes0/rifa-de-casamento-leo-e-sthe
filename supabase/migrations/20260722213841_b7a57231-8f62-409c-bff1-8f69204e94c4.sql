-- Drop overly permissive anon policy that exposed all columns via RLS
DROP POLICY IF EXISTS "Public can read raffle number status" ON public.raffle_numbers;

-- Revoke any lingering anon privileges on the base table
REVOKE ALL ON public.raffle_numbers FROM anon;

-- Recreate the public view WITHOUT security_invoker so it runs as owner and
-- exposes ONLY the safe columns to anonymous visitors.
DROP VIEW IF EXISTS public.raffle_numbers_public;
CREATE VIEW public.raffle_numbers_public
WITH (security_invoker = false) AS
SELECT number, status, payment_id
FROM public.raffle_numbers;

GRANT SELECT ON public.raffle_numbers_public TO anon, authenticated;