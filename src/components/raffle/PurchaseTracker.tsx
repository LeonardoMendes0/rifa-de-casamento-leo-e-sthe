import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper, Ticket, Check, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PendingPurchase {
  paymentId: string;
  ticketCode: string;
  name: string;
  phone?: string;
  email?: string;
  numbers: number[];
  total: number;
  createdAt: number;
}

const STORAGE_KEY = 'rifa_pending_purchases';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

const readPending = (): PendingPurchase[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PendingPurchase[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writePending = (list: PendingPurchase[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
};

const PurchaseTracker = () => {
  const [confirmed, setConfirmed] = useState<PendingPurchase | null>(null);
  const [open, setOpen] = useState(false);

  const check = useCallback(async () => {
    let list = readPending();
    if (list.length === 0) return;

    // remove muito antigos
    const now = Date.now();
    const fresh = list.filter((p) => now - p.createdAt < MAX_AGE_MS);
    if (fresh.length !== list.length) writePending(fresh);
    list = fresh;
    if (list.length === 0) return;

    const ids = list.map((p) => p.paymentId);
    const { data, error } = await (supabase as any)
      .from('raffle_numbers_public')
      .select('payment_id,status')
      .in('payment_id', ids);

    if (error || !data) return;

    // status por paymentId (se ao menos um número está pago, considera pago)
    const statusMap = new Map<string, string>();
    for (const row of data as { payment_id: string; status: string }[]) {
      const cur = statusMap.get(row.payment_id);
      if (row.status === 'paid' || !cur) statusMap.set(row.payment_id, row.status);
    }

    // Se algum foi pago e ainda não notificado, mostra o mais recente
    const paid = list
      .filter((p) => statusMap.get(p.paymentId) === 'paid')
      .sort((a, b) => b.createdAt - a.createdAt);

    if (paid.length > 0) {
      setConfirmed(paid[0]);
      setOpen(true);
      // remove todos os pagos e os que não existem mais no banco (liberados/expirados)
      const remaining = list.filter(
        (p) => statusMap.get(p.paymentId) && statusMap.get(p.paymentId) !== 'paid',
      );
      writePending(remaining);
      return;
    }

    // remove os que não existem mais no banco (reserva expirada e liberada)
    const remaining = list.filter((p) => statusMap.has(p.paymentId));
    if (remaining.length !== list.length) writePending(remaining);
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, 8000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  const handleClose = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold text-lg sm:text-xl">
            Pagamento confirmado! 🎉
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Seus números já estão garantidos
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence>
          {confirmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 py-2"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <PartyPopper className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gradient-gold">
                  Obrigado, {confirmed.name.split(' ')[0]}!
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Compra realizada por{' '}
                  <span className="font-semibold text-foreground">{confirmed.name}</span>
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Seu bilhete</p>
                  <p className="text-sm sm:text-base font-mono font-bold text-accent break-all">
                    {confirmed.ticketCode}
                  </p>
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-3 border border-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                  Números confirmados ({confirmed.numbers.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {confirmed.numbers.map((n) => (
                    <span
                      key={n}
                      className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold"
                    >
                      {String(n).padStart(3, '0')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  R$ {confirmed.total.toFixed(2)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pago em {new Date(confirmed.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <Button
                className="w-full bg-gradient-gold text-primary-foreground font-bold h-10 sm:h-12 text-sm"
                onClick={handleClose}
              >
                <Check className="w-4 h-4 mr-2" /> Concluir
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseTracker;
