import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PayerInput {
  name: string;
  phone: string;
  email: string;
  cpf?: string;
}

interface RequestBody {
  payer: PayerInput & { cpf: string };
  amount: number;
  ticketCode: string;
  selectedNumbers: number[];
}

// CPF genérico usado apenas para satisfazer a API do Mercado Pago quando o
// comprador não informa CPF. Não é armazenado como identificação real do usuário.
const DEFAULT_MP_CPF = '19119119100';

function validate(body: any): { ok: true; data: RequestBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corpo inválido' };
  const { payer, amount, ticketCode, selectedNumbers } = body;
  if (!payer || typeof payer.name !== 'string' || payer.name.trim().length < 3)
    return { ok: false, error: 'Nome inválido' };
  const phone = String(payer.phone || '').replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 11) return { ok: false, error: 'Telefone inválido' };
  const rawCpf = String(payer.cpf || '').replace(/\D/g, '');
  const cpf = rawCpf.length === 11 ? rawCpf : DEFAULT_MP_CPF;
  if (typeof payer.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email))
    return { ok: false, error: 'E-mail inválido' };
  if (typeof amount !== 'number' || amount <= 0) return { ok: false, error: 'Valor inválido' };
  if (typeof ticketCode !== 'string' || !ticketCode) return { ok: false, error: 'Código do bilhete inválido' };
  if (!Array.isArray(selectedNumbers) || selectedNumbers.length === 0)
    return { ok: false, error: 'Nenhum número selecionado' };
  return {
    ok: true,
    data: {
      payer: { name: payer.name.trim(), phone, cpf, email: payer.email.trim() },
      amount,
      ticketCode,
      selectedNumbers: selectedNumbers.map((n: any) => Number(n)),
    },
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

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
    const { payer, amount, ticketCode, selectedNumbers } = v.data;

    // 1) Reservar atomicamente todos os números escolhidos.
    const reservedAt = new Date().toISOString();
    const { data: reserved, error: reserveErr } = await supabase
      .from('raffle_numbers')
      .update({
        status: 'reserved',
        reserved_at: reservedAt,
        buyer_name: payer.name,
        buyer_phone: payer.phone,
        buyer_email: payer.email,
      })
      .in('number', selectedNumbers)
      .eq('status', 'available')
      .select('number');

    if (reserveErr) throw reserveErr;

    if (!reserved || reserved.length !== selectedNumbers.length) {
      // Rollback: liberar o que conseguimos reservar agora
      if (reserved && reserved.length > 0) {
        await supabase
          .from('raffle_numbers')
          .update({
            status: 'available',
            reserved_at: null,
            buyer_name: null,
            buyer_phone: null,
            buyer_email: null,
          })
          .in('number', reserved.map((r: any) => r.number));
      }
      const taken = selectedNumbers.filter((n) => !(reserved || []).some((r: any) => r.number === n));
      return new Response(
        JSON.stringify({
          error: `Números indisponíveis: ${taken.join(', ')}. Escolha outros.`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2) Criar cobrança PIX no Mercado Pago
    const [firstName, ...rest] = payer.name.split(' ');
    const lastName = rest.join(' ') || firstName;

    const mpBody = {
      transaction_amount: Number(amount.toFixed(2)),
      description: `Bilhete Rifa Leo e Sthe - ${ticketCode}`,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: payer.cpf },
      },
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${ticketCode}-${Date.now()}`,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('Mercado Pago error', mpRes.status, mpData);
      // Rollback
      await supabase
        .from('raffle_numbers')
        .update({
          status: 'available',
          reserved_at: null,
          buyer_name: null,
          buyer_phone: null,
          buyer_email: null,
        })
        .in('number', selectedNumbers);

      return new Response(
        JSON.stringify({
          error: mpData?.message || 'Falha ao gerar PIX no Mercado Pago',
          details: mpData,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3) Salvar payment_id nos números reservados
    await supabase
      .from('raffle_numbers')
      .update({ payment_id: String(mpData.id) })
      .in('number', selectedNumbers);

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
