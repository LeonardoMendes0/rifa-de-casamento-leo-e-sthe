import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRaffle, RaffleNumber } from '@/hooks/useRaffle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, LogOut, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RAFFLE_CONFIG = {
  title: 'Rifa do Casamento',
  description: 'Ajude-nos a realizar nosso sonho!',
  prizeDescription: 'Prêmio surpresa para o ganhador',
  totalNumbers: 1000,
  pricePerNumber: 30,
  pixKey: '21972410175',
};

const RECENT_MS = 60_000; // números pagos nos últimos 60s ganham destaque

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const raffle = useRaffle(RAFFLE_CONFIG);
  const [buyerRows, setBuyerRows] = useState<RaffleNumber[]>([]);

  const previousSoldRef = useRef<Set<number> | null>(null);
  const recentPaidRef = useRef<Map<number, number>>(new Map());
  const [, forceTick] = useState(0);


  // Auth check
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

  // Fetch buyer details (admin-only) directly from base table
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const fetchBuyers = async () => {
      const { data } = await supabase
        .from('raffle_numbers')
        .select('number,status,buyer_name,buyer_phone')
        .in('status', ['reserved', 'paid'])
        .order('number', { ascending: true });
      if (cancelled || !data) return;
      setBuyerRows(
        data.map((r: any) => ({
          number: r.number,
          status: r.status === 'paid' ? 'sold' : r.status === 'reserved' ? 'pending' : 'available',
          buyerName: r.buyer_name ?? undefined,
          buyerPhone: r.buyer_phone ?? undefined,
        })),
      );
    };
    fetchBuyers();
    const t = setInterval(fetchBuyers, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isAdmin]);

  // Detect newly paid numbers, show toast, mark as "recent"
  useEffect(() => {
    if (!isAdmin) return;
    const soldNow = new Set(
      buyerRows.filter((n) => n.status === 'sold').map((n) => n.number),
    );
    if (previousSoldRef.current) {
      const prev = previousSoldRef.current;
      const newlyPaid = buyerRows.filter(
        (n) => n.status === 'sold' && !prev.has(n.number),
      );
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


  // Tick to expire "recent" badges
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

  const reserved: RaffleNumber[] = raffle.numbers.filter(
    (n) => n.status === 'pending' || n.status === 'sold',
  );

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
          <p className="text-sm text-muted-foreground mb-3">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {reserved.map((n) => {
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Admin;
