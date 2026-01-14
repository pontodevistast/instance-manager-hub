import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGlobalSettings() {
    return useQuery({
        queryKey: ['global-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_settings')
                .select('*')
                .eq('location_id', 'agency')
                .maybeSingle();

            if (error) throw error;

            return {
                api_base_url: data?.api_base_url || import.meta.env.VITE_UAZAPI_BASE_URL || 'https://api.uazapi.com',
                global_api_token: data?.global_api_token || import.meta.env.VITE_UAZAPI_ADMIN_TOKEN || '',
                ghl_client_id: data?.ghl_client_id || import.meta.env.VITE_GHL_CLIENT_ID || '',
                ghl_client_secret: data?.ghl_client_secret || import.meta.env.VITE_GHL_CLIENT_SECRET || '',
            };
        },
    });
}
