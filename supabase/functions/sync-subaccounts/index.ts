import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log("[sync-subaccounts] Buscando API Key de agência...");
    
    // Pegar o token mais recente salvo
    const { data: tokenData, error: tokenError } = await supabase
      .from('ghl_agency_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) throw new Error("API Key não encontrada. Configure nas configurações do gestor.")

    console.log("[sync-subaccounts] Solicitando lista de subcontas ao CRM...");

    // Tenta buscar usando o endpoint de locations. 
    // Em API Keys privadas V2, não precisamos necessariamente do companyId se o token for de agência.
    let url = 'https://services.leadconnectorhq.com/locations/search?limit=100';
    if (tokenData.company_id) {
      url += `&companyId=${tokenData.company_id}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    })

    const data = await response.json()
    if (!response.ok) {
      console.error("[sync-subaccounts] Erro API CRM:", data);
      throw new Error(data.message || "Token inválido ou permissões insuficientes no CRM.");
    }

    const locations = data.locations || []
    console.log(`[sync-subaccounts] ${locations.length} subcontas recebidas.`);

    const upserts = locations.map((loc: any) => ({
      location_id: loc.id,
      account_name: loc.name,
      updated_at: new Date().toISOString()
    }))

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('ghl_uazapi_config')
        .upsert(upserts, { onConflict: 'location_id' })

      if (upsertError) throw upsertError
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: locations.length,
      message: `${locations.length} subcontas sincronizadas via API Key.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("[sync-subaccounts] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})