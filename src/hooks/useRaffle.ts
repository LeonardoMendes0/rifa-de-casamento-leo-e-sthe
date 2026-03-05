import { useState, useCallback } from 'react';

export type NumberStatus = 'available' | 'pending' | 'sold';

export interface RaffleNumber {
  number: number;
  status: NumberStatus;
  buyerName?: string;
  buyerPhone?: string;
  pixCode?: string;
  timestamp?: Date;
}

export interface RaffleConfig {
  title: string;
  description: string;
  prizeDescription: string;
  totalNumbers: number;
  pricePerNumber: number;
  pixKey: string;
}

const STORAGE_KEY = 'wedding-raffle-data';

const generatePixCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map(len =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    )
    .join('-');
};

const loadNumbers = (total: number): RaffleNumber[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as RaffleNumber[];
      if (parsed.length === total) return parsed;
    }
  } catch {}
  return Array.from({ length: total }, (_, i) => ({
    number: i + 1,
    status: 'available' as NumberStatus,
  }));
};

export const useRaffle = (config: RaffleConfig) => {
  const [numbers, setNumbers] = useState<RaffleNumber[]>(() => loadNumbers(config.totalNumbers));
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const saveNumbers = useCallback((nums: RaffleNumber[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nums));
  }, []);

  const toggleNumber = useCallback((num: number) => {
    setSelectedNumbers(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedNumbers([]), []);

  const confirmPurchase = useCallback(
    (buyerName: string, buyerPhone: string) => {
      const pixCode = generatePixCode();
      const updated = numbers.map(n =>
        selectedNumbers.includes(n.number)
          ? { ...n, status: 'pending' as NumberStatus, buyerName, buyerPhone, pixCode, timestamp: new Date() }
          : n
      );
      setNumbers(updated);
      saveNumbers(updated);
      setSelectedNumbers([]);
      return pixCode;
    },
    [numbers, selectedNumbers, saveNumbers]
  );

  const confirmPayment = useCallback(
    (num: number) => {
      const updated = numbers.map(n =>
        n.number === num ? { ...n, status: 'sold' as NumberStatus } : n
      );
      setNumbers(updated);
      saveNumbers(updated);
    },
    [numbers, saveNumbers]
  );

  const cancelReservation = useCallback(
    (num: number) => {
      const updated = numbers.map(n =>
        n.number === num
          ? { number: n.number, status: 'available' as NumberStatus }
          : n
      );
      setNumbers(updated);
      saveNumbers(updated);
    },
    [numbers, saveNumbers]
  );

  const stats = {
    available: numbers.filter(n => n.status === 'available').length,
    pending: numbers.filter(n => n.status === 'pending').length,
    sold: numbers.filter(n => n.status === 'sold').length,
    total: config.totalNumbers,
    revenue: numbers.filter(n => n.status === 'sold').length * config.pricePerNumber,
  };

  return {
    numbers,
    selectedNumbers,
    toggleNumber,
    clearSelection,
    confirmPurchase,
    confirmPayment,
    cancelReservation,
    stats,
    config,
  };
};
