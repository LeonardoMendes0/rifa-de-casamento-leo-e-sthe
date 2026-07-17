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

type Step = 'form' | 'loading' | 'pix' | 'paid';

const generateTicketCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `#RIFA-${s}`;
};

const maskCPF = (v: string) =>
  v.replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const PurchasePanel = ({ selectedNumbers, pricePerNumber, onConfirm, onClear }: PurchasePanelProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
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

  const formatTime = (s: number) => {
    const m = Math.floor(Math.max(s, 0) / 60).toString().padStart(2, '0');
    const r = (Math.max(s, 0) % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  const handleSubmit = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (name.trim().length < 3) return toast({ title: 'Informe seu nome completo', variant: 'destructive' });
    if (cleanCpf.length !== 11) return toast({ title: 'CPF inválido', variant: 'destructive' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast({ title: 'E-mail inválido', variant: 'destructive' });

    const ticketCode = generateTicketCode();
    setStep('loading');

    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          payer: { name: name.trim(), cpf: cleanCpf, email: email.trim() },
          amount: total,
          ticketCode,
          selectedNumbers,
        },
      });

      if (error) throw error;
      if (!data?.qrCode) throw new Error('Resposta inválida do Mercado Pago');

      onConfirm(name.trim(), cleanCpf);
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
      setSecondsLeft(30 * 60);
      setStep('pix');
      toast({ title: 'PIX gerado!', description: `Bilhete ${ticketCode} reservado.` });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Erro ao gerar PIX';
      toast({ title: 'Falha ao gerar PIX', description: msg, variant: 'destructive' });
      setStep('form');
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
    const shouldClearSelection = step === 'pix';
    setShowDialog(false);
    setTimeout(() => {
      setStep('form');
      setName('');
      setCpf('');
      setEmail('');
      setTicketCode('');
      setQrCodeBase64('');
      setCopiaCola('');
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
              {step === 'loading' && 'Gerando PIX...'}
              {step === 'pix' && 'Pagamento PIX'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {step === 'form' && `${selectedNumbers.length} número(s) · R$ ${total.toFixed(2)}`}
              {step === 'loading' && 'Aguarde, criando seu pagamento no Mercado Pago'}
              {step === 'pix' && 'Escaneie o QR Code ou copie o código abaixo'}
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
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">CPF</label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    inputMode="numeric"
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">E-mail</label>
                  <Input
                    type="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-gold text-primary-foreground font-bold h-10 sm:h-12 text-sm"
                  onClick={handleSubmit}
                >
                  Gerar PIX (R$ {total.toFixed(2)})
                </Button>
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
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PurchasePanel;
