import { motion } from 'framer-motion';
import { RaffleNumber } from '@/hooks/useRaffle';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface NumberGridProps {
  numbers: RaffleNumber[];
  selectedNumbers: number[];
  onToggle: (num: number) => void;
}

const NumberGrid = ({ numbers, selectedNumbers, onToggle }: NumberGridProps) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'sold' | 'pending'>('all');

  const filtered = numbers.filter(n => {
    if (search && !String(n.number).includes(search)) return false;
    if (filter !== 'all' && n.status !== filter) return false;
    return true;
  });

  return (
    <section className="py-8 sm:py-12 px-3 sm:px-4" id="numbers">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-gold mb-2">
            Escolha seus Números
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Toque nos números para selecionar</p>
        </motion.div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          {[
            { label: 'Disponível', color: 'bg-secondary border-border' },
            { label: 'Selecionado', color: 'bg-primary border-primary' },
            { label: 'Pendente', color: 'bg-accent/30 border-accent' },
            { label: 'Vendido', color: 'bg-muted border-muted-foreground/30' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 sm:w-4 sm:h-4 rounded border', item.color)} />
              <span className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card border-border text-sm"
            />
          </div>
          <div className="flex gap-0.5 sm:gap-1 rounded-lg bg-card border border-border p-1 overflow-x-auto">
            {(['all', 'available', 'sold', 'pending'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs rounded-md transition-all font-medium whitespace-nowrap',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f === 'all' ? 'Todos' : f === 'available' ? 'Livres' : f === 'sold' ? 'Vendidos' : 'Pendentes'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="max-h-[60vh] sm:max-h-[500px] overflow-y-auto number-grid-scroll rounded-xl border border-border bg-card/50 p-2 sm:p-4">
          <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] xl:grid-cols-[repeat(20,minmax(0,1fr))] gap-1 sm:gap-1.5">
            {filtered.map(n => {
              const isSelected = selectedNumbers.includes(n.number);
              const isAvailable = n.status === 'available';
              const isPending = n.status === 'pending';
              const isSold = n.status === 'sold';

              return (
                <motion.button
                  key={n.number}
                  whileTap={isAvailable ? { scale: 0.9 } : {}}
                  onClick={() => isAvailable && onToggle(n.number)}
                  disabled={!isAvailable}
                  className={cn(
                    'aspect-square rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center border transition-all duration-150',
                    isSelected && 'bg-primary text-primary-foreground border-primary shadow-gold',
                    isAvailable && !isSelected && 'bg-secondary/50 border-border text-foreground active:bg-primary/30 cursor-pointer',
                    isPending && 'bg-accent/20 border-accent/40 text-accent cursor-not-allowed',
                    isSold && 'bg-muted/50 border-muted text-muted-foreground/40 cursor-not-allowed line-through'
                  )}
                >
                  {String(n.number).padStart(3, '0')}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NumberGrid;
