import { motion } from 'framer-motion';
import { Ticket, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

interface StatsBarProps {
  stats: {
    available: number;
    pending: number;
    sold: number;
    total: number;
    revenue: number;
  };
}

const StatsBar = ({ stats }: StatsBarProps) => {
  const progress = ((stats.sold + stats.pending) / stats.total) * 100;

  const items = [
    { icon: Ticket, label: 'Disponíveis', value: stats.available, color: 'text-primary' },
    { icon: Clock, label: 'Pendentes', value: stats.pending, color: 'text-accent' },
    { icon: CheckCircle2, label: 'Vendidos', value: stats.sold, color: 'text-primary' },
    { icon: TrendingUp, label: 'Arrecadado', value: `R$ ${stats.revenue}`, color: 'text-primary' },
  ];

  return (
    <section className="py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">
            <span>Progresso da Rifa</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 sm:h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 text-center"
            >
              <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1.5 sm:mb-2 ${item.color}`} />
              <p className={`text-lg sm:text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
