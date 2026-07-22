-- Switch view back to security_invoker so it runs as the querying role
DROP VIEW IF EXISTS public.raffle_numbers_public;
CREATE VIEW public.raffle_numbers_public
WITH (security_invoker = true) AS
SELECT number, status, payment_id
FROM public.raffle_numbers;

GRANT SELECT ON public.raffle_numbers_public TO anon, authenticated;

-- Grant anon SELECT ONLY on the safe columns of the base table (needed for
-- security_invoker view to work). Sensitive PII columns (buyer_name,
-- buyer_phone, buyer_email) are NOT granted, so they cannot be read even if
-- an anon user queried the base table directly.
GRANT SELECT (number, status, payment_id) ON public.raffle_numbers TO anon;

-- Restrictive RLS policy for anon: allow row visibility so the safe columns
-- are readable through the view. Column-level grants (above) enforce that
-- PII is never returned to anon.
CREATE POLICY "Anon can read safe raffle columns"
ON public.raffle_numbers
FOR SELECT
TO anon
USING (true);