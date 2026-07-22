import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import HeroSection from '@/components/raffle/HeroSection';
import NumberGrid from '@/components/raffle/NumberGrid';
import PurchasePanel from '@/components/raffle/PurchasePanel';
import StatsBar from '@/components/raffle/StatsBar';
import PurchaseTracker from '@/components/raffle/PurchaseTracker';
import { useRaffle } from '@/hooks/useRaffle';


const RAFFLE_CONFIG = {
  title: 'Rifa do Casamento',
  description: 'Ajude-nos a realizar nosso sonho!',
  prizeDescription: 'Prêmio surpresa para o ganhador',
  totalNumbers: 1000,
  pricePerNumber: 30,
  pixKey: '21972410175',
};

const Index = () => {
  const raffle = useRaffle(RAFFLE_CONFIG);

  return (
    <div className="min-h-screen bg-background">
      <PurchaseTracker />
      <div className="fixed top-4 right-4 z-50">

        <Link
          to="/auth"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-primary/30 bg-card/80 backdrop-blur-sm text-primary hover:bg-card"
          aria-label="Acesso admin"
        >
          <Shield className="w-4 h-4" />
        </Link>
      </div>

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

      <footer className="py-8 text-center border-t border-border">
        <p className="text-xs text-muted-foreground">
          Feito com ❤️ para o nosso casamento
        </p>
      </footer>
    </div>
  );
};

export default Index;
