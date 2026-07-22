import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRaffle, RaffleNumber } from '@/hooks/useRaffle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, LogOut, Sparkles, Loader2, Search, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RAFFLE_CONFIG = {
  title: 'Rifa do Casamento',
  description: 'Ajude-nos a realizar nosso sonho!',
  prizeDescription: 'Prêmio surpresa para o ganhador',
  totalNumbers: 1000,
  pricePerNumber: 30,
  pixKey: '21972410175',
};

const RECENT_MS = 60_000;

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const raffle = useRaffle(RAFFLE_CONFIG);
  const [buyerRows, setBuyerRows] = useState<RaffleNumber[]>([]);
  const [search, setSearch] = useState('');
  const [releaseTarget, setReleaseTarget] = useState<RaffleNumber | null>(null);
  const [releasing, setReleasing] = useState(false);

  const previousSoldRef = useRef<Set<number> | null>(null);
  const recentPaidRef = useRef<Map<number, number>>(new Map());
  const [, forceTick] = useState(0);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserEmail(session.user.email || '');
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!roles);
      setChecking(false);
    };
    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/auth');
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const fetchBuyers = async () => {
    const { data } = await supabase
      .from('raffle_numbers')
      .select('number,status,buyer_name,buyer_phone')
      .in('status', ['reserved', 'paid'])
      .order('number', { ascending: true });
    if (!data) return;
    setBuyerRows(
      data.map((r: any) => ({
        number: r.number,
        status: r.status === 'paid' ? 'sold' : r.status === 'reserved' ? 'pending' : 'available',
        buyerName: r.buyer_name ?? undefined,
        buyerPhone: r.buyer_phone ?? undefined,
      })),
    );
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchBuyers();
    const t = setInterval(fetchBuyers, 8000);
    return () => clearInterval(t);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const soldNow = new Set(buyerRows.filter((n) => n.status === 'sold').map((n) => n.number));
    if (previousSoldRef.current) {
      const prev = previousSoldRef.current;
      const newlyPaid = buyerRows.filter((n) => n.status === 'sold' && !prev.has(n.number));
      if (newlyPaid.length > 0) {
        const now = Date.now();
        newlyPaid.forEach((n) => {
          recentPaidRef.current.set(n.number, now);
          toast({
            title: `🎉 Número ${String(n.number).padStart(3, '0')} pago!`,
            description: `Reservado para ${n.buyerName || 'comprador'}`,
          });
        });
        forceTick((t) => t + 1);
      }
    }
    previousSoldRef.current = soldNow;
  }, [buyerRows, isAdmin, toast]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      let changed = false;
      recentPaidRef.current.forEach((ts, num) => {
        if (now - ts > RECENT_MS) {
          recentPaidRef.current.delete(num);
          changed = true;
        }
      });
      if (changed) forceTick((v) => v + 1);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleRelease = async () => {
    if (!releaseTarget) return;
    setReleasing(true);
    const { error } = await supabase
      .from('raffle_numbers')
      .update({
        status: 'available',
        buyer_name: null,
        buyer_phone: null,
        buyer_email: null,
        payment_id: null,
        reserved_at: null,
      })
      .eq('number', releaseTarget.number);
    setReleasing(false);
    if (error) {
      toast({ title: 'Erro ao disponibilizar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: `Número ${String(releaseTarget.number).padStart(3, '0')} disponibilizado`,
      description: 'O número está liberado para nova compra.',
    });
    setReleaseTarget(null);
    await Promise.all([fetchBuyers(), raffle.refresh()]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyerRows;
    const digits = q.replace(/\D/g, '');
    return buyerRows.filter((n) => {
      const numStr = String(n.number).padStart(3, '0');
      const name = (n.buyerName || '').toLowerCase();
      const phone = (n.buyerPhone || '').replace(/\D/g, '');
      return (
        numStr.includes(q) ||
        String(n.number).includes(q) ||
        name.includes(q) ||
        (digits && phone.includes(digits))
      );
    });
  }, [buyerRows, search]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            <h1 className="text-lg font-bold">Sem permissão</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sua conta ({userEmail}) não tem acesso admin. Peça ao dono do projeto para conceder acesso.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>Voltar</Button>
            <Button className="flex-1" onClick={handleSignOut}>Sair</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-gradient-gold">Painel Administrativo</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{userEmail}</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>Ver rifa</Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sair
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Disponíveis</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{raffle.stats.available}</p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendentes</p>
            <p className="text-xl sm:text-2xl font-bold text-accent">{raffle.stats.pending}</p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pagos</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{raffle.stats.sold}</p>
          </Card>
        </div>

        <Card className="p-3 sm:p-4 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} de {buyerRows.length} reservado(s) ou vendido(s)
            </p>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, nome ou telefone"
                className="pl-8"
              />
            </div>
          </div>

          {buyerRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma reserva ainda</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum resultado encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Nº</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => {
                  const isRecent = recentPaidRef.current.has(n.number);
                  return (
                    <TableRow
                      key={n.number}
                      className={`border-border ${isRecent ? 'bg-primary/10 animate-pulse' : ''}`}
                    >
                      <TableCell className="font-mono font-bold text-primary">
                        {String(n.number).padStart(3, '0')}
                      </TableCell>
                      <TableCell>{n.buyerName}</TableCell>
                      <TableCell className="text-xs">{n.buyerPhone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              n.status === 'sold'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-accent/20 text-accent'
                            }`}
                          >
                            {n.status === 'sold' ? 'Pago' : 'Pendente'}
                          </span>
                          {isRecent && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                              <Sparkles className="w-2.5 h-2.5" /> NOVO
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReleaseTarget(n)}
                          className="h-8 border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Disponibilizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <AlertDialog open={!!releaseTarget} onOpenChange={(o) => !o && setReleaseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disponibilizar número {releaseTarget && String(releaseTarget.number).padStart(3, '0')}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai apagar os dados do comprador
              {releaseTarget?.buyerName ? ` (${releaseTarget.buyerName})` : ''} e liberar o número
              para nova compra. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease} disabled={releasing}>
              {releasing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disponibilizar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
