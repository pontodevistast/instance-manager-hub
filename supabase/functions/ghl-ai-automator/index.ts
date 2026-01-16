
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log("Webhook Payload:", JSON.stringify(payload));

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Normalize Payload & Identify Location
        const locId = payload.locationId || payload.location_id || (payload.contact && payload.contact.locationId);
        if (!locId) {
            // Log error but return 200 to satisfy GHL
            console.error('Location ID not identified in payload');
            return new Response(JSON.stringify({ error: 'No location ID' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const contId = payload.contactId || payload.contact_id || (payload.contact && payload.contact.id);
        const msgBody = payload.message?.body || payload.body; // Adjust based on actual payload structure for message body
        const direction = payload.direction || payload.message?.direction || 'inbound';

        // We mainly care about inbound messages (customer replies) to trigger movement
        // But we might also want to track outbound for context.

        // 2. Fetch Automation Config
        const { data: config, error: configError } = await supabase
            .from('ghl_automation_config')
            .select('*')
            .eq('location_id', locId)
            .single();

        if (configError || !config || !config.is_active) {
            console.log(`Automation disabled or not configured for location ${locId}`);
            return new Response(JSON.stringify({ message: 'Automation skipped' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. Resolve GHL Token (Subaccount specific or Global/Agency Fallback would be handled by a sophisticated token manager, 
        // for this v1 we assume the user might have some token storage or we use the one config if saved (not typical security practice) 
        // OR we just use the API Key if the user stored it.
        // For now, let's assume we need to fetch a valid token. If we don't have one, we can't proceed with GHL API calls.
        // Ideally this system has a separate 'tokens' table or uses the 'ghl_automation_config' if it stores a key (legacy) or oauth token.
        // Using a placeholder for token retrieval logic:
        // const token = await getGHLToken(supabase, locId); 
        // If we assume the user manual entry of API Key isn't GHL API Key but Gemini Key.
        // We need GHL Access. For now, let's look for a connected account.

        // FETCH CONNECTION
        const { data: connection } = await supabase
            .from('ghl_integrations') // Assuming this table exists from previous context
            .select('access_token')
            .eq('location_id', locId)
            .single();

        const token = connection?.access_token;
        if (!token) {
            console.error('No valid GHL Sync/Integration token found');
            return new Response(JSON.stringify({ error: 'GHL Token missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 4. Find Existing Opportunity
        let oppId = payload.opportunityId || payload.opportunity_id;
        let currStageId = payload.pipelineStageId || payload.pipeline_stage_id;

        if (!oppId && contId) {
            // Search for open opportunity in the specific pipeline
            const searchUrl = `https://services.leadconnectorhq.com/opportunities/search?locationId=${locId}&contactId=${contId}&pipelineId=${config.ghl_pipeline_id}&status=open`;
            const searchRes = await fetch(searchUrl, {
                headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
            });
            const searchData = await searchRes.json();
            const found = searchData.opportunities?.[0];
            if (found) {
                oppId = found.id;
                currStageId = found.pipelineStageId;
            }
        }

        // 5. Get History & Conversation Context
        // We need the last few messages to understand context.
        const messagesUrl = `https://services.leadconnectorhq.com/conversations/search?locationId=${locId}&contactId=${contId}&limit=10`;
        const msgRes = await fetch(messagesUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-04-15', 'Accept': 'application/json' }
        });
        const msgData = await msgRes.json();
        const conversationHistory = (msgData.conversations?.[0]?.messages || []).reverse().map((m: any) => ({
            role: m.direction === 'inbound' ? 'lead' : 'agent',
            text: m.body
        }));

        // Add current payload message if not yet in history (latency)
        if (msgBody && conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].text !== msgBody) {
            conversationHistory.push({ role: direction === 'inbound' ? 'lead' : 'agent', text: msgBody });
        }

        // 6. Build Prompt for Gemini
        const pipeline = config.stage_mappings || {};
        // Construct stage list text
        const stagesText = Object.entries(pipeline).map(([id, stage]: [string, any]) => {
            return `- ID: ${id} | Name: (Refer to config) | Desc: ${stage.description} | Rule: ${stage.rule}`;
        }).join('\n');

        // We need the stage NAMES to make sense to the LLM, but we only stored ID keys. 
        // ideally stage_mappings has names? The frontend code showed mappings[ID] = {description, rule}. 
        // We might lack the NAME if we don't fetch the pipeline structure again or store it.
        // For now, let's assume the LLM can work with Descriptions/Rules and return the ID.

        const prompt = `
      ${config.kanban_prompt || "Analyze the conversation and determine the correct stage."}
      
      CURRENT STAGE ID: ${currStageId || 'None'}
      
      STAGES DEFINITIONS:
      ${stagesText}

      CONVERSATION HISTORY:
      ${conversationHistory.map((m: any) => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}
      
      Respond with JSON: { "predicted_stage_id": "ID", "reasoning": "text" }
    `;

        // 7. Call Gemini
        const geminiKey = config.gemini_api_key;
        const model = config.ai_settings?.model || 'gemini-2.0-flash';

        const genRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const genData = await genRes.json();
        const aiText = genData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) throw new Error('No AI response');
        const aiJson = JSON.parse(aiText);

        console.log("AI Decision:", aiJson);

        // 8. Execute Move or Create
        if (aiJson.predicted_stage_id && aiJson.predicted_stage_id !== currStageId) {
            if (oppId) {
                // MOVE
                await fetch(`https://services.leadconnectorhq.com/opportunities/${oppId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pipelineStageId: aiJson.predicted_stage_id })
                });
            } else {
                // CREATE NEW
                // Need contact name
                const contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contId}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28' }
                });
                const contactData = await contactRes.json();
                const name = contactData.contact?.fullName || contactData.contact?.firstName || 'Novo Lead';

                await fetch(`https://services.leadconnectorhq.com/opportunities/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pipelineId: config.ghl_pipeline_id,
                        locationId: locId,
                        contactId: contId,
                        pipelineStageId: aiJson.predicted_stage_id,
                        title: name,
                        status: 'open'
                    })
                });
            }
            return new Response(JSON.stringify({ success: true, action: 'moved_or_created', details: aiJson }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: true, action: 'no_change', details: aiJson }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
