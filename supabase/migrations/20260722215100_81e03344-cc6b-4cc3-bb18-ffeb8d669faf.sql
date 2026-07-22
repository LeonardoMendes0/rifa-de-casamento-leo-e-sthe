DROP POLICY IF EXISTS "Anon can read safe raffle columns" ON public.raffle_numbers;
REVOKE SELECT ON public.raffle_numbers FROM anon;