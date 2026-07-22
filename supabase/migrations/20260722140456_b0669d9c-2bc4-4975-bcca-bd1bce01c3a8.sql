
-- Recreate view with security_invoker so it uses the querying user's RLS/grants
DROP VIEW IF EXISTS public.raffle_numbers_public;
CREATE VIEW public.raffle_numbers_public
WITH (security_invoker = true) AS
SELECT number, status, payment_id
FROM public.raffle_numbers;

GRANT SELECT ON public.raffle_numbers_public TO anon, authenticated;

-- Column-level grants so anon can read only the safe columns via the view
GRANT SELECT (number, status, payment_id) ON public.raffle_numbers TO anon;

-- Allow anon RLS row visibility for those safe columns
CREATE POLICY "Public can read raffle number status"
  ON public.raffle_numbers
  FOR SELECT
  TO anon
  USING (true);
