import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface AutomationConfig {
    location_id: string;
    agent_prompt: string;
    kanban_prompt: string;
    knowledge_base: string;
    ghl_pipeline_id: string;
    stage_mappings: Record<string, { description: string; rule: string }>;
    ai_settings: {
        model: string;
        temperature: number;
    };
    is_active: boolean;
    delay_seconds: number;
    gemini_api_key: string;
}

export function useGhlAutomation(locationId: string | undefined) {
    const [config, setConfig] = useState<AutomationConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchConfig() {
            if (!locationId) return;

            try {
                const { data, error } = await supabase
                    .from('ghl_automation_config')
                    .select('*')
                    .eq('location_id', locationId)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    // Ensure structure for JSON fields
                    setConfig({
                        location_id: data.location_id,
                        agent_prompt: data.agent_prompt || '',
                        kanban_prompt: data.kanban_prompt || '',
                        knowledge_base: data.knowledge_base || '',
                        ghl_pipeline_id: data.ghl_pipeline_id || '',
                        stage_mappings: (data.stage_mappings as any) || {},
                        ai_settings: (data.ai_settings as any) || { model: 'gemini-2.0-flash', temperature: 0.2 },
                        is_active: !!data.is_active,
                        delay_seconds: data.delay_seconds || 30,
                        gemini_api_key: data.gemini_api_key || ''
                    });
                } else {
                    // Default empty config
                    setConfig({
                        location_id: locationId,
                        agent_prompt: '',
                        kanban_prompt: '',
                        knowledge_base: '',
                        ghl_pipeline_id: '',
                        stage_mappings: {
                            contato_feito: { description: '', rule: '' },
                            aguardando_proposta: { description: '', rule: '' },
                            proposta_enviada: { description: '', rule: '' },
                            em_negociacao: { description: '', rule: '' },
                            follow_up: { description: '', rule: '' },
                            vistoria_pendente: { description: '', rule: '' },
                            termo_pendente: { description: '', rule: '' },
                            fechado: { description: '', rule: '' },
                            perdido: { description: '', rule: '' }
                        },
                        ai_settings: { model: 'gemini-2.0-flash', temperature: 0.2 },
                        is_active: false,
                        delay_seconds: 30,
                        gemini_api_key: ''
                    });
                }
            } catch (err: any) {
                console.error('Error fetching automation config:', err);
                toast({
                    title: 'Erro ao carregar configurações',
                    description: err.message,
                    variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchConfig();
    }, [locationId]);

    const saveConfig = async (newConfig: AutomationConfig) => {
        if (!locationId) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('ghl_automation_config')
                .upsert({
                    location_id: newConfig.location_id,
                    agent_prompt: newConfig.agent_prompt,
                    kanban_prompt: newConfig.kanban_prompt,
                    knowledge_base: newConfig.knowledge_base,
                    ghl_pipeline_id: newConfig.ghl_pipeline_id,
                    stage_mappings: newConfig.stage_mappings as any,
                    ai_settings: newConfig.ai_settings as any,
                    is_active: newConfig.is_active,
                    delay_seconds: newConfig.delay_seconds,
                    gemini_api_key: newConfig.gemini_api_key,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setConfig(newConfig);
            toast({
                title: 'Configurações salvas',
                description: 'Automação atualizada com sucesso.'
            });
        } catch (err: any) {
            console.error('Error saving automation config:', err);
            toast({
                title: 'Erro ao salvar',
                description: err.message,
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return { config, setConfig, isLoading, isSaving, saveConfig };
}
