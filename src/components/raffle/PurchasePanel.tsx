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
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-lg mx-auto bg-card border border-primary/30 rounded-2xl p-4 shadow-gold backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedNumbers.length} número{selectedNumbers.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total: <span className="text-primary font-bold">R$ {total.toFixed(2)}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={onClear}>
                <X className="w-4 h-4" />
              </Button>
              <Button
                className="bg-gradient-gold text-primary-foreground font-bold px-6"
                onClick={() => setShowDialog(true)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar via PIX
              </Button>
            </div>
          </div>

          {/* Selected numbers preview */}
          <div className="flex flex-wrap gap-1 mt-3 max-h-16 overflow-y-auto">
            {selectedNumbers.map(n => (
              <span
                key={n}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold"
              >
                {String(n).padStart(3, '0')}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold text-xl">
              {step === 'form' ? 'Finalizar Compra' : 'Pagamento PIX'}
            </DialogTitle>
            <DialogDescription>
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
                className="space-y-4"
              >
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Seu nome</label>
                  <Input
                    placeholder="Nome completo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">WhatsApp</label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Números escolhidos:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNumbers.map(n => (
                      <span key={n} className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">
                        {String(n).padStart(3, '0')}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-gold text-primary-foreground font-bold h-12"
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
                className="space-y-4"
              >
                <div className="bg-secondary rounded-xl p-6 text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-3">Código PIX (Copia e Cola)</p>
                  <div className="bg-background rounded-lg p-4 font-mono text-sm text-primary break-all border border-primary/20">
                    {pixCode}
                  </div>
                  <Button
                    className="mt-4 bg-gradient-gold text-primary-foreground font-bold"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copiar Código</>
                    )}
                  </Button>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                  <p className="text-xs text-accent font-medium">
                    ⚠️ Após o pagamento, envie o comprovante pelo WhatsApp para confirmarmos sua reserva.
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">R$ {total.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
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
