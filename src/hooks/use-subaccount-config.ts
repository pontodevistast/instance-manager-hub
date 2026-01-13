import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSubaccountConfig(locationId: string | null) {
  return useQuery({
    queryKey: ['subaccount-config', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('ghl_uazapi_config')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!locationId,
  });
}