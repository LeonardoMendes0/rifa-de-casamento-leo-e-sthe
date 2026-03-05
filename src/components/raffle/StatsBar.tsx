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
    { icon: CheckCircle2, label: 'Vendidos', value: stats.sold, color: 'text-green-500' },
    { icon: TrendingUp, label: 'Arrecadado', value: `R$ ${stats.revenue}`, color: 'text-primary' },
  ];

  return (
    <section className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progresso da Rifa</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 text-center"
            >
              <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
