import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type NumberStatus = 'available' | 'pending' | 'sold';

export interface RaffleNumber {
  number: number;
  status: NumberStatus;
  buyerName?: string;
  buyerPhone?: string;
}

export interface RaffleConfig {
  title: string;
  description: string;
  prizeDescription: string;
  totalNumbers: number;
  pricePerNumber: number;
  pixKey: string;
}

const mapStatus = (s: string): NumberStatus =>
  s === 'paid' ? 'sold' : s === 'reserved' ? 'pending' : 'available';

export const useRaffle = (config: RaffleConfig) => {
  const [numbers, setNumbers] = useState<RaffleNumber[]>(() =>
    Array.from({ length: config.totalNumbers }, (_, i) => ({
      number: i + 1,
      status: 'available' as NumberStatus,
    })),
  );
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('raffle_numbers')
      .select('number,status,buyer_name,buyer_phone')
      .order('number', { ascending: true });
    if (error || !data) return;
    setNumbers(
      data.map((r: any) => ({
        number: r.number,
        status: mapStatus(r.status),
        buyerName: r.buyer_name ?? undefined,
        buyerPhone: r.buyer_phone ?? undefined,
      })),
    );
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('raffle_numbers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffle_numbers' },
        () => fetchAll(),
      )
      .subscribe();

    const poll = setInterval(fetchAll, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [fetchAll]);

  const toggleNumber = useCallback((num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num],
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedNumbers([]), []);

  // Compat: chamado após gerar PIX. A reserva real acontece na edge function.
  const confirmPurchase = useCallback(
    (_name: string, _phone: string) => {
      fetchAll();
      return '';
    },
    [fetchAll],
  );

  const confirmPayment = useCallback(async (_num: number) => {
    // Admin: confirmação manual é feita pelo webhook do Mercado Pago.
    await fetchAll();
  }, [fetchAll]);

  const cancelReservation = useCallback(async (_num: number) => {
    await fetchAll();
  }, [fetchAll]);

  const stats = {
    available: numbers.filter((n) => n.status === 'available').length,
    pending: numbers.filter((n) => n.status === 'pending').length,
    sold: numbers.filter((n) => n.status === 'sold').length,
    total: config.totalNumbers,
    revenue: numbers.filter((n) => n.status === 'sold').length * config.pricePerNumber,
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
    refresh: fetchAll,
  };
};
