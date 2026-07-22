import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShoppingCart, Copy, Check, X, CreditCard, Loader2, Ticket, Clock, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PurchasePanelProps {
  selectedNumbers: number[];
  pricePerNumber: number;
  onConfirm: (name: string, phone: string) => string;
  onClear: () => void;
}

type Step = 'form' | 'confirm' | 'loading' | 'pix' | 'paid';

const generateTicketCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `#RIFA-${s}`;
};

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{0,2})/, '($1');
  if (d.length <= 6) return d.replace(/(\d{2})(\d{0,4})/, '($1) $2');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const PurchasePanel = ({ selectedNumbers, pricePerNumber, onConfirm, onClear }: PurchasePanelProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [copied, setCopied] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [copiaCola, setCopiaCola] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [paymentId, setPaymentId] = useState<string>('');
  const { toast } = useToast();

  const total = selectedNumbers.length * pricePerNumber;

  useEffect(() => {
    if (step !== 'pix') return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  // Polling: verifica status do pagamento a cada 4s enquanto o modal PIX está aberto
  useEffect(() => {
    if (step !== 'pix' || !paymentId) return;
    let cancelled = false;

    const check = async () => {
      const { data } = await (supabase as any)
        .from('raffle_numbers_public')
        .select('status')
        .eq('payment_id', paymentId)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.status === 'paid') {

        setStep('paid');
        toast({ title: 'Pagamento confirmado! 🎉', description: `Bilhete ${ticketCode} confirmado.` });
      }
    };

    check();
    const t = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [step, paymentId, ticketCode, toast]);

  const formatTime = (s: number) => {
    const m = Math.floor(Math.max(s, 0) / 60).toString().padStart(2, '0');
    const r = (Math.max(s, 0) % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  const validateForm = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (name.trim().length < 3) {
      toast({ title: 'Informe seu nome completo', variant: 'destructive' });
      return false;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({ title: 'Telefone inválido', description: 'Informe DDD + número', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleOpenConfirm = () => {
    if (!validateForm()) return;
    setStep('confirm');
  };

  const handleSubmit = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const ticketCode = generateTicketCode();
    setStep('loading');

    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          payer: { name: name.trim(), phone: cleanPhone, instagram: email.trim() },
          amount: total,
          ticketCode,
          selectedNumbers,
        },
      });

      if (error) throw error;
      if (!data?.qrCode) throw new Error('Resposta inválida do Mercado Pago');

      onConfirm(name.trim(), cleanPhone);
      const copia = data.qrCode || '';
      let qrImg = data.qrCodeBase64 ? `data:image/png;base64,${data.qrCodeBase64}` : '';
      if (!qrImg && copia) {
        try {
          qrImg = await QRCode.toDataURL(copia, { width: 320, margin: 1 });
        } catch (err) {
          console.error('QR fallback failed', err);
        }
      }
      setQrCodeBase64(qrImg);
      setCopiaCola(copia);
      setTicketCode(data.ticketCode || ticketCode);
      const pid = data.paymentId ? String(data.paymentId) : '';
      setPaymentId(pid);
      setSecondsLeft(30 * 60);
      setStep('pix');

      // Persistir compra pendente para mostrar confirmação quando o usuário voltar
      if (pid) {
        try {
          const key = 'rifa_pending_purchases';
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          list.push({
            paymentId: pid,
            ticketCode: data.ticketCode || ticketCode,
            name: name.trim(),
            phone: cleanPhone,
            email: email.trim(),
            numbers: selectedNumbers,
            total,
            createdAt: Date.now(),
          });
          localStorage.setItem(key, JSON.stringify(list));
        } catch {
          // ignore storage errors
        }
      }

      toast({ title: 'PIX gerado!', description: `Bilhete ${ticketCode} reservado.` });

    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Erro ao gerar PIX';
      toast({ title: 'Falha ao gerar PIX', description: msg, variant: 'destructive' });
      setStep('confirm');
    }
  };

  const handleCopy = async () => {
    if (!copiaCola) return;
    await navigator.clipboard.writeText(copiaCola);
    setCopied(true);
    toast({ title: 'Código PIX copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    const shouldClearSelection = step === 'pix' || step === 'paid';
    setShowDialog(false);
    setTimeout(() => {
      setStep('form');
      setName('');
      setPhone('');
      setEmail('');
      setTicketCode('');
      setQrCodeBase64('');
      setCopiaCola('');
      setPaymentId('');
      setSecondsLeft(30 * 60);
      if (shouldClearSelection) onClear();
    }, 200);
  };

  if (selectedNumbers.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 safe-bottom"
      >
        <div className="max-w-lg mx-auto bg-card border border-primary/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-gold backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  {selectedNumbers.length} nº{selectedNumbers.length > 1 ? 's' : ''}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Total: <span className="text-primary font-bold">R$ {total.toFixed(2)}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8 sm:h-10 sm:w-10">
                <X className="w-4 h-4" />
              </Button>
              <Button
                className="bg-gradient-gold text-primary-foreground font-bold text-xs sm:text-sm px-3 sm:px-6 h-8 sm:h-10"
                onClick={() => setShowDialog(true)}
              >
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Pagar via </span>PIX
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2 sm:mt-3 max-h-12 sm:max-h-16 overflow-y-auto">
            {selectedNumbers.map((n) => (
              <span
                key={n}
                className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold"
              >
                {String(n).padStart(3, '0')}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <Dialog open={showDialog} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold text-lg sm:text-xl">
              {step === 'form' && 'Seus dados'}
              {step === 'confirm' && 'Confirmar dados'}
              {step === 'loading' && 'Gerando PIX...'}
              {step === 'pix' && 'Pagamento PIX'}
              {step === 'paid' && 'Pagamento confirmado! 🎉'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {step === 'form' && `${selectedNumbers.length} número(s) · R$ ${total.toFixed(2)}`}
              {step === 'confirm' && 'Confira os dados antes de gerar o PIX'}
              {step === 'loading' && 'Aguarde, criando seu pagamento no Mercado Pago'}
              {step === 'pix' && 'Escaneie o QR Code ou copie o código abaixo'}
              {step === 'paid' && 'Seus números foram confirmados com sucesso'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 sm:space-y-4"
              >
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Nome completo</label>
                  <Input
                    placeholder="João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Telefone para contato</label>
                  <Input
                    placeholder="(99) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    inputMode="tel"
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">
                    Instagram <span className="text-muted-foreground/70">(opcional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="@seuinstagram"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-gold text-primary-foreground font-bold h-10 sm:h-12 text-sm"
                  onClick={handleOpenConfirm}
                >
                  Gerar PIX (R$ {total.toFixed(2)})
                </Button>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="bg-secondary rounded-lg p-3 border border-border space-y-2">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Nome</p>
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-semibold text-foreground">{phone}</p>
                  </div>
                  {email.trim() && (
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Instagram</p>
                      <p className="text-sm font-semibold text-foreground break-all">{email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Números escolhidos ({selectedNumbers.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedNumbers.map((n) => (
                        <span key={n} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">
                          {String(n).padStart(3, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-primary">R$ {total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 sm:h-12 text-sm"
                    onClick={() => setStep('form')}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-gold text-primary-foreground font-bold h-10 sm:h-12 text-sm"
                    onClick={handleSubmit}
                  >
                    Confirmar e gerar PIX
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Conectando ao Mercado Pago...</p>
              </motion.div>
            )}

            {step === 'pix' && (
              <motion.div
                key="pix"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-2.5 sm:p-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Seu bilhete</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-accent break-all">
                      {ticketCode}
                    </p>
                  </div>
                </div>

                {qrCodeBase64 && (
                  <div className="bg-white rounded-xl p-3 sm:p-4 flex justify-center">
                    <img
                      src={qrCodeBase64}
                      alt="QR Code PIX"
                      className="w-48 h-48 sm:w-56 sm:h-56"
                    />
                  </div>
                )}

                <div className="bg-secondary rounded-lg p-3 border border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Código PIX (copia e cola)</p>
                  <div className="bg-background rounded-md p-2 sm:p-3 font-mono text-[10px] sm:text-xs text-foreground break-all border border-border max-h-24 overflow-y-auto">
                    {copiaCola}
                  </div>
                  <Button
                    className="w-full mt-3 bg-gradient-gold text-primary-foreground font-bold text-sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copiar código PIX</>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 border border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Expira em</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-primary">
                    {formatTime(secondsLeft)}
                  </span>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3">
                  <p className="text-[11px] sm:text-xs text-foreground">
                    ✅ Bilhete <span className="font-bold text-primary">{ticketCode}</span> reservado!
                    Após o pagamento, seus números serão confirmados automaticamente.
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-primary">R$ {total.toFixed(2)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {selectedNumbers.length} número(s) × R$ {pricePerNumber.toFixed(2)}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'paid' && (
              <motion.div
                key="paid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 py-2"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                    <PartyPopper className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gradient-gold">
                    Pagamento confirmado!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Obrigado por participar da nossa rifa 💛
                  </p>
                </div>

                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Seu bilhete</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-accent break-all">
                      {ticketCode}
                    </p>
                  </div>
                </div>

                <div className="bg-secondary rounded-lg p-3 border border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                    Números confirmados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNumbers.map((n) => (
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
                    R$ {total.toFixed(2)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    Pagamento recebido com sucesso
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
    </>
  );
};

export default PurchasePanel;
