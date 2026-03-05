import { useState } from 'react';
import { motion } from 'framer-motion';
import { RaffleNumber } from '@/hooks/useRaffle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Check, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminPanelProps {
  numbers: RaffleNumber[];
  onConfirmPayment: (num: number) => void;
  onCancelReservation: (num: number) => void;
}

const ADMIN_PASS = '1234'; // Change this

const AdminPanel = ({ numbers, onConfirmPayment, onCancelReservation }: AdminPanelProps) => {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { toast } = useToast();

  const reserved = numbers.filter(n => n.status === 'pending' || n.status === 'sold');

  const handleLogin = () => {
    if (password === ADMIN_PASS) {
      setAuthenticated(true);
    } else {
      toast({ title: 'Senha incorreta', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full border-primary/30 bg-card/80 backdrop-blur-sm"
          onClick={() => setOpen(true)}
        >
          <Shield className="w-4 h-4 text-primary" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold">Painel Administrativo</DialogTitle>
            <DialogDescription>Gerencie os números da rifa</DialogDescription>
          </DialogHeader>

          {!authenticated ? (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Senha do admin"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="bg-secondary border-border pr-10"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button className="w-full bg-gradient-gold text-primary-foreground" onClick={handleLogin}>
                Entrar
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {reserved.length} número(s) reservado(s) ou vendido(s)
              </p>

              {reserved.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma reserva ainda</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Nº</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PIX</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reserved.map(n => (
                      <TableRow key={n.number} className="border-border">
                        <TableCell className="font-mono font-bold text-primary">
                          {String(n.number).padStart(3, '0')}
                        </TableCell>
                        <TableCell>{n.buyerName}</TableCell>
                        <TableCell className="text-xs">{n.buyerPhone}</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              n.status === 'sold'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-accent/20 text-accent'
                            }`}
                          >
                            {n.status === 'sold' ? 'Pago' : 'Pendente'}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] max-w-[120px] truncate">
                          {n.pixCode}
                        </TableCell>
                        <TableCell>
                          {n.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-500 hover:bg-green-500/10"
                                onClick={() => onConfirmPayment(n.number)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => onCancelReservation(n.number)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPanel;
