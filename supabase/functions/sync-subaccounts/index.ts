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
    console.log("[sync-subaccounts] Buscando token mais recente...");
    
    // 1. Pegar o token de agência mais recente
    const { data: tokenData, error: tokenError } = await supabase
      .from('ghl_agency_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) throw new Error("Nenhum token de autorização encontrado. Conecte o CRM primeiro.")

    console.log("[sync-subaccounts] Buscando subcontas no CRM...");

    // 2. Buscar subcontas no CRM (usando o endpoint de locations)
    // Nota: O endpoint varia dependendo se o token é de agência ou subconta específica
    const response = await fetch(`https://services.leadconnectorhq.com/locations/search?companyId=${tokenData.company_id}&limit=100`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Falha ao buscar subcontas no CRM")

    const locations = data.locations || []
    console.log(`[sync-subaccounts] Encontradas ${locations.length} subcontas.`);

    // 3. Inserir/Atualizar na tabela ghl_uazapi_config
    const upserts = locations.map((loc: any) => ({
      location_id: loc.id,
      account_name: loc.name,
      updated_at: new Date().toISOString()
    }))

    const { error: upsertError } = await supabase
      .from('ghl_uazapi_config')
      .upsert(upserts, { onConflict: 'location_id' })

    if (upsertError) throw upsertError

    return new Response(JSON.stringify({ 
      success: true, 
      count: locations.length,
      message: `${locations.length} subcontas sincronizadas.` 
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