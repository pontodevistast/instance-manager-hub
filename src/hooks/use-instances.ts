import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Instance } from '@/types/instance';
import { useToast } from '@/hooks/use-toast';

export function useInstances(locationId: string | null) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchInstances = useCallback(async () => {
    if (!locationId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar instâncias:', error);
      toast({
        title: 'Erro ao buscar instâncias',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [locationId, toast]);

  useEffect(() => {
    fetchInstances();

    if (!locationId) return;

    // Inscrição para atualizações em tempo real
    const channel = supabase
      .channel(`instances-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instances',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          fetchInstances();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, fetchInstances]);

  return { instances, isLoading, refetch: fetchInstances };
}