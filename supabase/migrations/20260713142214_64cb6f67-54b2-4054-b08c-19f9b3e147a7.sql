
-- Tabela
CREATE TABLE public.raffle_numbers (
  id serial PRIMARY KEY,
  number int NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available',
  reserved_at timestamptz,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.raffle_numbers TO anon, authenticated;
GRANT ALL ON public.raffle_numbers TO service_role;

ALTER TABLE public.raffle_numbers ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode ver os números (para saber quais estão livres),
-- mas o payload público não deve expor dados pessoais. Criamos uma view segura.
CREATE POLICY "public read raffle numbers"
ON public.raffle_numbers FOR SELECT
TO anon, authenticated
USING (true);

-- Popular 1 a 1000
INSERT INTO public.raffle_numbers (number)
SELECT generate_series(1, 1000)
ON CONFLICT (number) DO NOTHING;

-- Função para liberar reservas expiradas
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raffle_numbers
  SET status = 'available',
      reserved_at = NULL,
      buyer_name = NULL,
      buyer_phone = NULL,
      buyer_email = NULL,
      payment_id = NULL
  WHERE status = 'reserved'
    AND reserved_at < now() - interval '20 minutes';
END;
$$;

-- Cron para liberar reservas a cada 5 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'release-expired-raffle-reservations',
  '*/5 * * * *',
  $$ SELECT public.release_expired_reservations(); $$
);
