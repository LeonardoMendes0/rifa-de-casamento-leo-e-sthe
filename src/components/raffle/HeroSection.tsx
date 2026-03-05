import { motion } from 'framer-motion';
import coupleHero from '@/assets/couple-hero.jpg';
import { Heart } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={coupleHero} alt="Casal apaixonado" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Floating particles - fewer on mobile */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40 hidden sm:block"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-primary/30 bg-primary/10 mb-4 sm:mb-6"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">Nosso Grande Dia</span>
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary" />
          </motion.div>
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-5xl md:text-7xl font-bold text-gradient-gold mb-3 sm:mb-4 leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Rifa do Casamento
        </motion.h1>

        <motion.p
          className="text-sm sm:text-lg md:text-xl text-foreground/70 mb-6 sm:mb-8 max-w-xl mx-auto px-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Ajude-nos a realizar o sonho do nosso casamento! Escolha seus números da sorte e concorra a prêmios incríveis 🎉
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center gap-3 sm:gap-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { label: 'Números', value: '1.000' },
            { label: 'Por número', value: 'R$ 30' },
            { label: 'Prêmio', value: 'R$ 1.000' },
          ].map((item) => (
            <div key={item.label} className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-card/80 border border-border backdrop-blur-sm">
              <p className="text-lg sm:text-2xl font-bold text-primary">{item.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
