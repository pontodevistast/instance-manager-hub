import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subaccount {
  location_id: string;
  account_name: string | null;
}

export function useSubaccounts() {
  return useQuery({
    queryKey: ['subaccounts'],
    queryFn: async () => {
      // Busca dados das subcontas na tabela de configuração (que possui o nome)
      const { data, error } = await supabase
        .from('ghl_uazapi_config')
        .select('location_id, account_name')
        .order('account_name', { ascending: true });

      if (error) throw error;

      // Se houver instâncias sem config (caso raro), poderíamos buscar, 
      // mas como agora estamos sincronizando via CRM, a ghl_uazapi_config é a fonte principal.
      return (data || []) as Subaccount[];
    }
  });
}