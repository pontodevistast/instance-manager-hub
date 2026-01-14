import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSubaccountConfig(locationId: string | null) {
  return useQuery({
    queryKey: ['subaccount-config', locationId],
    queryFn: async () => {
      if (!locationId) return null;

      // 1. Fetch Global Settings
      const { data: globalData } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('location_id', 'agency')
        .maybeSingle();

      // 2. Fetch Local Settings
      const { data: localData, error } = await supabase
        .from('ghl_uazapi_config')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;

      const globalVars = {
        api_base_url: globalData?.api_base_url || import.meta.env.VITE_UAZAPI_BASE_URL || 'https://api.uazapi.com',
        global_api_token: globalData?.global_api_token || import.meta.env.VITE_UAZAPI_ADMIN_TOKEN || '',
      };

      console.log('[useSubaccountConfig] Debug:', {
        locationId,
        localToken: localData?.ghl_token,
        globalVars
      });

      // Merge: local values override global values
      return {
        ...localData,
        api_base_url: localData?.api_base_url || globalVars.api_base_url,
        api_token: localData?.api_token || globalVars.global_api_token,
      };
    },
    enabled: !!locationId,
  });
}