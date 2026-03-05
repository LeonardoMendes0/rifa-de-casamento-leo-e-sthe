import { AnimatePresence } from 'framer-motion';
import HeroSection from '@/components/raffle/HeroSection';
import NumberGrid from '@/components/raffle/NumberGrid';
import PurchasePanel from '@/components/raffle/PurchasePanel';
import StatsBar from '@/components/raffle/StatsBar';
import AdminPanel from '@/components/raffle/AdminPanel';
import { useRaffle } from '@/hooks/useRaffle';

const RAFFLE_CONFIG = {
  title: 'Rifa do Casamento',
  description: 'Ajude-nos a realizar nosso sonho!',
  prizeDescription: 'Prêmio surpresa para o ganhador',
  totalNumbers: 1000,
  pricePerNumber: 30,
  pixKey: 'sua-chave-pix@email.com',
};

const Index = () => {
  const raffle = useRaffle(RAFFLE_CONFIG);

  return (
    <div className="min-h-screen bg-background">
      <AdminPanel
        numbers={raffle.numbers}
        onConfirmPayment={raffle.confirmPayment}
        onCancelReservation={raffle.cancelReservation}
      />

      <HeroSection />
      <StatsBar stats={raffle.stats} />
      <NumberGrid
        numbers={raffle.numbers}
        selectedNumbers={raffle.selectedNumbers}
        onToggle={raffle.toggleNumber}
      />

      <AnimatePresence>
        {raffle.selectedNumbers.length > 0 && (
          <PurchasePanel
            selectedNumbers={raffle.selectedNumbers}
            pricePerNumber={RAFFLE_CONFIG.pricePerNumber}
            onConfirm={raffle.confirmPurchase}
            onClear={raffle.clearSelection}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-border">
        <p className="text-xs text-muted-foreground">
          Feito com ❤️ para o nosso casamento
        </p>
      </footer>
    </div>
  );
};

export default Index;
