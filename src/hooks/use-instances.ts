import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Instance } from '@/types/instance';
import { useToast } from '@/hooks/use-toast';

export function useInstances(locationId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['instances', locationId];

  // Busca inicial e gerenciamento de cache via React Query
  const { data: instances = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!locationId) return [];
      
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Instance[];
    },
    enabled: !!locationId,
  });

  // Configuração do Supabase Realtime
  useEffect(() => {
    if (!locationId) return;

    const channel = supabase
      .channel(`instances_changes_${locationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instances',
          filter: `location_id=eq.${locationId}`,
        },
        (payload) => {
          const updatedInstance = payload.new as Instance;
          const oldInstance = payload.old as Instance;

          // Invalida o cache para forçar um refetch e manter os dados consistentes
          queryClient.invalidateQueries({ queryKey });

          // Notifica o usuário sobre a mudança de status se ela ocorreu
          if (oldInstance && updatedInstance.status !== oldInstance.status) {
            toast({
              title: 'Status atualizado',
              description: `A instância "${updatedInstance.instance_name}" agora está ${updatedInstance.status}.`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'instances',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'instances',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    // Cleanup: Remove a inscrição ao desmontar o componente ou mudar o locationId
    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, queryClient, queryKey, toast]);

  return { 
    instances, 
    isLoading, 
    refetch 
  };
}