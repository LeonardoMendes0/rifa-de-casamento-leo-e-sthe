const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PayerInput {
  name: string;
  cpf: string;
  email: string;
}

interface RequestBody {
  payer: PayerInput;
  amount: number;
  ticketCode: string;
  selectedNumbers: number[];
}

function validate(body: any): { ok: true; data: RequestBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corpo inválido' };
  const { payer, amount, ticketCode, selectedNumbers } = body;
  if (!payer || typeof payer.name !== 'string' || payer.name.trim().length < 3)
    return { ok: false, error: 'Nome inválido' };
  const cpf = String(payer.cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11) return { ok: false, error: 'CPF inválido' };
  if (typeof payer.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email))
    return { ok: false, error: 'E-mail inválido' };
  if (typeof amount !== 'number' || amount <= 0) return { ok: false, error: 'Valor inválido' };
  if (typeof ticketCode !== 'string' || !ticketCode) return { ok: false, error: 'Código do bilhete inválido' };
  if (!Array.isArray(selectedNumbers) || selectedNumbers.length === 0)
    return { ok: false, error: 'Nenhum número selecionado' };
  return {
    ok: true,
    data: {
      payer: { name: payer.name.trim(), cpf, email: payer.email.trim() },
      amount,
      ticketCode,
      selectedNumbers,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Access Token não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const v = validate(body);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { payer, amount, ticketCode } = v.data;

    const [firstName, ...rest] = payer.name.split(' ');
    const lastName = rest.join(' ') || firstName;

    const mpBody = {
      transaction_amount: Number(amount.toFixed(2)),
      description: `Bilhete Rifa Leo e Sthe - Código ${ticketCode}`,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: payer.cpf },
      },
    };

    const idempotencyKey = `${ticketCode}-${Date.now()}`;

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('Mercado Pago error', mpRes.status, mpData);
      return new Response(
        JSON.stringify({
          error: mpData?.message || 'Falha ao gerar PIX no Mercado Pago',
          details: mpData,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const tx = mpData?.point_of_interaction?.transaction_data || {};

    return new Response(
      JSON.stringify({
        paymentId: mpData.id,
        status: mpData.status,
        ticketCode,
        qrCode: tx.qr_code,
        qrCodeBase64: tx.qr_code_base64,
        ticketUrl: tx.ticket_url,
        expiresAt: mpData.date_of_expiration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Edge function error', err);
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
