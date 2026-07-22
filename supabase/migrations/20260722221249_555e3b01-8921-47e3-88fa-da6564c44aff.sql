ALTER VIEW public.raffle_numbers_public SET (security_invoker = false);
GRANT SELECT ON public.raffle_numbers_public TO anon, authenticated;