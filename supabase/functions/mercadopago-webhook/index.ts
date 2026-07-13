import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!token) return new Response('missing token', { status: 500 });

    const url = new URL(req.url);
    let paymentId: string | null =
      url.searchParams.get('data.id') || url.searchParams.get('id');
    let topic = url.searchParams.get('type') || url.searchParams.get('topic');

    if (!paymentId && req.method !== 'GET') {
      try {
        const body = await req.json();
        topic = body?.type || body?.topic || topic;
        paymentId = body?.data?.id ? String(body.data.id) : paymentId;
      } catch {
        // ignore
      }
    }

    if (topic && topic !== 'payment') {
      return new Response('ignored', { status: 200 });
    }
    if (!paymentId) {
      return new Response('missing payment id', { status: 200 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payment = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP payment lookup failed', mpRes.status, payment);
      return new Response('mp lookup failed', { status: 200 });
    }

    if (payment.status === 'approved') {
      await supabase
        .from('raffle_numbers')
        .update({ status: 'paid' })
        .eq('payment_id', String(paymentId));
    } else if (
      payment.status === 'cancelled' ||
      payment.status === 'rejected' ||
      payment.status === 'expired'
    ) {
      await supabase
        .from('raffle_numbers')
        .update({
          status: 'available',
          reserved_at: null,
          buyer_name: null,
          buyer_phone: null,
          buyer_email: null,
          payment_id: null,
        })
        .eq('payment_id', String(paymentId));
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook error', err);
    return new Response('ok', { status: 200 });
  }
});
