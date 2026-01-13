import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSubaccounts() {
  return useQuery({
    queryKey: ['subaccounts'],
    queryFn: async () => {
      // Busca location_ids únicos das duas tabelas principais
      const [instancesRes, ghlRes] = await Promise.all([
        supabase.from('instances').select('location_id'),
        supabase.from('ghl_uazapi_config').select('location_id')
      ]);

      const allIds = [
        ...(instancesRes.data?.map(i => i.location_id) || []),
        ...(ghlRes.data?.map(g => g.location_id) || [])
      ];

      // Remove duplicados e retorna lista única
      return Array.from(new Set(allIds));
    }
  });
}