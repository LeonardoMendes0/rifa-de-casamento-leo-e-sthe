import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShoppingCart, Copy, Check, X, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchasePanelProps {
  selectedNumbers: number[];
  pricePerNumber: number;
  onConfirm: (name: string, phone: string) => string;
  onClear: () => void;
}

const PurchasePanel = ({ selectedNumbers, pricePerNumber, onConfirm, onClear }: PurchasePanelProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'form' | 'pix'>('form');
  const { toast } = useToast();

  const total = selectedNumbers.length * pricePerNumber;

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const code = onConfirm(name.trim(), phone.trim());
    setPixCode(code);
    setStep('pix');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({ title: 'Código PIX copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShowDialog(false);
    setStep('form');
    setName('');
    setPhone('');
    setPixCode('');
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

          {/* Selected numbers preview */}
          <div className="flex flex-wrap gap-1 mt-2 sm:mt-3 max-h-12 sm:max-h-16 overflow-y-auto">
            {selectedNumbers.map(n => (
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

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold text-lg sm:text-xl">
              {step === 'form' ? 'Finalizar Compra' : 'Pagamento PIX'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {step === 'form'
                ? `${selectedNumbers.length} número(s) · R$ ${total.toFixed(2)}`
                : 'Copie o código abaixo e pague via PIX'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Seu nome</label>
                  <Input
                    placeholder="Nome completo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">WhatsApp</label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                </div>

                <div className="bg-secondary/50 rounded-lg p-2 sm:p-3 border border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Números escolhidos:</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedNumbers.map(n => (
                      <span key={n} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">
                        {String(n).padStart(3, '0')}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-gold text-primary-foreground font-bold h-10 sm:h-12 text-sm"
                  onClick={handleSubmit}
                >
                  Gerar Código PIX
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="pix"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="bg-secondary rounded-xl p-4 sm:p-6 text-center border border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Código PIX (Copia e Cola)</p>
                  <div className="bg-background rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm text-primary break-all border border-primary/20 select-all">
                    {pixCode}
                  </div>
                  <Button
                    className="mt-3 sm:mt-4 bg-gradient-gold text-primary-foreground font-bold text-sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copiar Código</>
                    )}
                  </Button>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-2.5 sm:p-3">
                  <p className="text-[10px] sm:text-xs text-accent font-medium">
                    ⚠️ Após o pagamento, envie o comprovante pelo WhatsApp para confirmarmos sua reserva.
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
