import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGhlAutomation } from '@/hooks/use-ghl-automation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Zap, Bot, Database, Settings2, RefreshCw, Key, AlertCircle, MessageSquare, ChevronRight, Activity, Play, Terminal, History, Trash2, User, UserCog, ArrowRight, Send, Copy, ExternalLink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SimpleErrorBoundary } from '@/components/SimpleErrorBoundary';

export default function SubaccountAutomationPage() {
    return (
        <SimpleErrorBoundary>
            <SubaccountAutomationContent />
        </SimpleErrorBoundary>
    );
}

function SubaccountAutomationContent() {
    const { locationId } = useParams();
    const { config, setConfig, isLoading, isSaving, saveConfig } = useGhlAutomation(locationId);
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [isLoadingGHL, setIsLoadingGHL] = useState(false);
    const [ghlError, setGhlError] = useState<string | null>(null);
    const { toast } = useToast();
    const [simulationInput, setSimulationInput] = useState(''); // This will now be for the individual message input
    const [simulationRole, setSimulationRole] = useState<'lead' | 'agent'>('lead');
    const [chatHistory, setChatHistory] = useState<{ role: 'lead' | 'agent', text: string }[]>([]);
    const [movementLogs, setMovementLogs] = useState<{
        triggerMessage: string;
        fromStageName: string;
        toStageId: string;
        toStageName: string;
        reasoning: string;
    }[]>([]);
    const [currentSimulatedStage, setCurrentSimulatedStage] = useState<{ id: string, name: string } | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isGeneratingRules, setIsGeneratingRules] = useState(false);

    const DEFAULT_PROMPT_TEMPLATE = `# Classificador de Estágio de Kanban - Inteligência Artificial

## RESUMO EXECUTIVO
Sua missão é ler a conversa e retornar o ID do estágio correto no Kanban baseado nas regras de negócio.

**Processo em 5 passos:**
1. 📍 Identifique o estágio atual: {{ESTAGIO_ATUAL}}
2. 🔍 Analise a última mensagem do lead e do atendente.
3. ⚖️ Use a tabela de prioridades (seção 6).
4. ✅ Se houver mudança de estágio → retorne o Novo ID.
5. ❌ Se não houver mudança → retorne o ID Atual.

---

## 1. CONHECIMENTO DO NEGÓCIO (CONTEXTO)
{{CONHECIMENTO_AGENTE}}

---

## 2. INSTRUÇÕES GERAIS
{{INSTRUCOES_PERSONALIZADAS}}

---

## 3. ESTÁGIOS DO KANBAN (DEFINIÇÕES)
{{TABELA_ESTAGIOS}}

---

## 4. MATRIZ DE TRANSIÇÃO LÓGICA
Analise a progressão lógica da conversa. Embora transições diretas sejam preferíveis, avalie se o lead "pulou" etapas com base nas mensagens (ex: pedir para fechar antes de receber proposta).

---

## 5. CRITÉRIOS DETALHADOS POR ESTÁGIO
{{DETALHES_ESTAGIOS}}

---

## 6. PRIORIDADE DE PROCESSAMENTO
Sempre avalie da etapa mais avançada (fundo do funil) para a inicial. Se os critérios de uma etapa avançada forem satisfeitos, ela tem prioridade.

**Ordem de Prioridade:**
{{LISTA_PRIORIDADE}}

---

## 7. MAPEAMENTO RÁPIDO PARA RESPOSTA
{{MAPEAMENTO_IDS}}

---

## 8. FORMATO DE SAÍDA (Obrigatório)
Retorne APENAS um objeto JSON válido no formato abaixo.

{
  "predicted_stage_id": "string",
  "predicted_stage_name": "string",
  "reasoning": "Explique brevemente por que o lead foi (ou não) movido."
}`;
    const [simulationResult, setSimulationResult] = useState<{
        stageId: string;
        stageName: string;
        reasoning: string;
    } | null>(null);

    const fetchGHDPipelines = useCallback(async (manual = false) => {
        if (!locationId) return;
        setIsLoadingGHL(true);
        setGhlError(null);
        try {
            const { data, error } = await supabase.functions.invoke('ghl-api-proxy', {
                body: { path: '/opportunities/pipelines', method: 'GET', locationId: locationId }
            });
            if (error) throw new Error(error.message);
            if (data.error) throw new Error(data.error);

            const fetchedPipelines = data.pipelines || [];
            setPipelines(fetchedPipelines);
            if (manual) toast({ title: "Sincronizado", description: "Pipelines carregadas do GHL." });
        } catch (error: any) {
            setGhlError(`Erro GHL: ${error.message}`);
        } finally {
            setIsLoadingGHL(false);
        }
    }, [locationId, toast]);

    useEffect(() => {
        fetchGHDPipelines();
    }, [fetchGHDPipelines]);

    const currentStages = useMemo(() => {
        const pipeline = pipelines.find(p => p.id === config?.ghl_pipeline_id);
        return pipeline?.stages || [];
    }, [config?.ghl_pipeline_id, pipelines]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse text-sm">Configurando seu ambiente...</p>
            </div>
        );
    }


    const handleSave = () => {
        if (config) saveConfig(config);
    };

    const handleGenerateStageRules = async () => {
        if (!config?.gemini_api_key) {
            toast({ title: "Chave ausente", description: "Configure a Gemini API Key na aba IA primeiro.", variant: "destructive" });
            return;
        }

        setIsGeneratingRules(true);
        try {
            const pipelineStages = pipelines.find(p => p.id === config.ghl_pipeline_id)?.stages || [];
            if (pipelineStages.length === 0) throw new Error("Selecione um pipeline primeiro.");

            const stageNames = pipelineStages.map(s => s.name).join(', ');
            const prompt = `Analise os nomes destes estágios de um funil de vendas: [${stageNames}].
            Para cada estágio, gere uma descrição curta e uma regra clara de quando o lead deve ser movido para este estágio.
            Retorne APENAS um JSON no formato:
            {
              "Nome da Etapa": { "description": "Descrição aqui", "rule": "Critério aqui" }
            }`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.gemini_api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            const generated = JSON.parse(data.candidates[0].content.parts[0].text);

            // Normalize keys from AI for case-insensitive matching
            const generatedKeys = Object.keys(generated);
            console.log("IA gerou chaves:", generatedKeys);
            console.log("Estágios do Pipeline:", pipelineStages.map(s => ({ id: s.id, name: s.name })));

            // Create FRESH mappings (don't spread old ones with wrong keys)
            const newMappings: Record<string, { description: string; rule: string }> = {};

            pipelineStages.forEach(s => {
                // Find the best matching key from AI response
                // Simple normalization match first
                let bestMatchKey = generatedKeys.find(k =>
                    k.toLowerCase().trim() === s.name.toLowerCase().trim()
                );

                // Fallback: Check if one contains the other (e.g. "Novo Lead" vs "Novo Lead (Entrada)")
                if (!bestMatchKey) {
                    bestMatchKey = generatedKeys.find(k =>
                        k.toLowerCase().includes(s.name.toLowerCase()) ||
                        s.name.toLowerCase().includes(k.toLowerCase())
                    );
                }

                if (bestMatchKey) {
                    console.log(`✅ Matched Stage "${s.name}" (ID: ${s.id}) with AI Key "${bestMatchKey}"`);
                    const aiData = generated[bestMatchKey];
                    newMappings[s.id] = {
                        description: aiData.description || aiData.desc || '', // Handle potential variations in JSON keys
                        rule: aiData.rule || aiData.criteria || aiData.criterio || ''
                    };
                } else {
                    console.warn(`❌ No match found for stage: ${s.name} (ID: ${s.id})`);
                    // Set empty values for unmatched stages
                    newMappings[s.id] = { description: '', rule: '' };
                }
            });

            console.log("Mapeamentos gerados:", newMappings);

            setConfig(prev => prev ? { ...prev, stage_mappings: newMappings } : null);
            toast({ title: "Mágica Feita!", description: "Regras sugeridas com sucesso." });
        } catch (error: any) {
            console.error("Erro na Mágica do IA:", error);
            toast({ title: "Erro na IA", description: error.message, variant: "destructive" });
        } finally {
            setIsGeneratingRules(false);
        }
    };

    const updateStageField = (stageId: string, field: 'description' | 'rule', value: string) => {
        if (!config) return;
        const currentData = config.stage_mappings[stageId] || { description: '', rule: '' };
        setConfig({
            ...config,
            stage_mappings: {
                ...config.stage_mappings,
                [stageId]: { ...currentData, [field]: value }
            }
        });
    };

    const handleSimulate = async (customHistory?: typeof chatHistory) => {
        if (!config?.gemini_api_key) {
            toast({
                title: "Erro de Configuração",
                description: "Você precisa configurar uma Gemini API Key na aba IA para simular.",
                variant: "destructive"
            });
            return;
        }

        const historyToAnalyze = customHistory || chatHistory;
        if (historyToAnalyze.length === 0) return;

        setIsSimulating(true);
        // We don't clear simulationResult here to keep the last state while loading

        try {
            // 1. Generate the Stages Table for Section 3
            const stagesTable = currentStages.map(s => {
                const data = (config.stage_mappings[s.id] as any) || { description: 'Sem descrição.', rule: 'Sem regra.' };
                return `| \`${s.name}\` | \`${s.id}\` | ${data.description} |`;
            }).join('\n');

            // 2. Generate Detailed Criteria for Section 5
            const detailedCriteria = currentStages.map(s => {
                const data = (config.stage_mappings[s.id] as any) || { description: '', rule: '' };
                return `### \`${s.name}\` (${s.id})\n**Descrição:** ${data.description}\n**Gatilho de Movimentação:** ${data.rule}\n`;
            }).join('\n');

            // 3. Generate Priority List for Section 6 (Reverse order: bottom of funnel first)
            const priorityList = [...currentStages].reverse().map((s, i) => `${i + 1}. **${s.name}**`).join('\n');

            // 4. Generate ID Mapping for Section 7
            const idMapping = currentStages.map(s => `| ${s.name} | \`${s.id}\` |`).join('\n');

            const conversationText = historyToAnalyze.map(m => `${m.role === 'lead' ? 'Lead' : 'Atendente'}: ${m.text}`).join('\n');

            // Use the template from config or fallback to default
            let systemPrompt = config.kanban_prompt || DEFAULT_PROMPT_TEMPLATE;

            // Perform replacements
            systemPrompt = systemPrompt
                .replace(/{{ESTAGIO_ATUAL}}/g, `${currentSimulatedStage?.name || 'Início do Funil'} (ID: ${currentSimulatedStage?.id || 'null'})`)
                .replace(/{{CONHECIMENTO_AGENTE}}/g, config.knowledge_base || 'Sem contexto definido.')
                .replace(/{{INSTRUCOES_PERSONALIZADAS}}/g, 'Siga as prioridades e regras de transição abaixo.')
                .replace(/{{TABELA_ESTAGIOS}}/g, stagesTable)
                .replace(/{{DETALHES_ESTAGIOS}}/g, detailedCriteria)
                .replace(/{{LISTA_PRIORIDADE}}/g, priorityList)
                .replace(/{{MAPEAMENTO_IDS}}/g, idMapping);

            const modelName = config.ai_settings.model || 'gemini-2.0-flash';
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.gemini_api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt }, { text: `CONVERSA PARA ANALISAR:\n${conversationText}` }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        response_mime_type: "application/json"
                    }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message || "Erro na API do Gemini");

            const resultText = data.candidates[0].content.parts[0].text;
            const resultJson = JSON.parse(resultText);

            // Check if stage changed
            if (resultJson.predicted_stage_id !== currentSimulatedStage?.id) {
                const lastMsg = historyToAnalyze[historyToAnalyze.length - 1];
                setMovementLogs(prev => [
                    {
                        triggerMessage: lastMsg.text,
                        fromStageName: currentSimulatedStage?.name || 'Início',
                        toStageId: resultJson.predicted_stage_id,
                        toStageName: resultJson.predicted_stage_name,
                        reasoning: resultJson.reasoning
                    },
                    ...prev
                ]);
                setCurrentSimulatedStage({ id: resultJson.predicted_stage_id, name: resultJson.predicted_stage_name });
            }

            setSimulationResult({
                stageId: resultJson.predicted_stage_id,
                stageName: resultJson.predicted_stage_name,
                reasoning: resultJson.reasoning
            });

        } catch (error: any) {
            console.error("Simulation error:", error);
            toast({
                title: "Erro na Simulação",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSimulating(false);
        }
    };

    const handleSendMessage = () => {
        if (!simulationInput.trim()) return;

        const newMessage = { role: simulationRole, text: simulationInput };
        const newHistory = [...chatHistory, newMessage];
        setChatHistory(newHistory);
        setSimulationInput('');

        // Automatically trigger simulation if it's the lead speaking
        if (simulationRole === 'lead') {
            handleSimulate(newHistory);
        }
    };

    const clearSimulation = () => {
        setChatHistory([]);
        setMovementLogs([]);
        setCurrentSimulatedStage(null);
        setSimulationResult(null);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
            {/* Top Navigation / Status */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border shadow-sm ring-1 ring-primary/5">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="p-4 bg-primary rounded-2xl shadow-lg shadow-primary/30">
                            <Zap className="h-6 w-6 text-white" />
                        </div>
                        {config?.is_active && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Mover Kanban</h1>
                        <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                            {config?.is_active ? (
                                <span className="text-green-600 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Bot Operando em Tempo Real</span>
                            ) : (
                                <span className="text-amber-500 font-bold">Bot Pausado</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-muted/40 px-5 py-2.5 rounded-2xl border transition-all hover:bg-muted/60">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2 cursor-pointer" htmlFor="bot-toggle">Status Geral</Label>
                        <Switch
                            id="bot-toggle"
                            checked={config?.is_active || false}
                            onCheckedChange={(val) => setConfig(prev => prev ? { ...prev, is_active: val } : null)}
                            className="data-[state=checked]:bg-green-500 shadow-inner"
                        />
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="rounded-2xl px-8 h-12 bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 gap-2 group">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                        <span className="font-bold">Salvar Configurações</span>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="ia" className="w-full">
                <TabsList className="flex w-full max-w-md bg-muted/30 border p-1 rounded-2xl mb-8">
                    <TabsTrigger value="ia" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-3 transition-all text-xs font-bold gap-2">
                        <Bot className="h-4 w-4" /> IA & Modelos
                    </TabsTrigger>
                    <TabsTrigger value="kanban" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-3 transition-all text-xs font-bold gap-2">
                        <Zap className="h-4 w-4" /> Funil Dinâmico
                    </TabsTrigger>
                    <TabsTrigger value="simulacao" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-3 transition-all text-xs font-bold gap-2">
                        <Play className="h-4 w-4" /> Teste de Conversa
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ia" className="space-y-6 focus-visible:outline-none">
                    <div className="grid gap-6 lg:grid-cols-5">
                        <div className="lg:col-span-3 space-y-6">
                            <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden">
                                <CardHeader className="bg-primary/[0.02] border-b border-primary/5 pb-4 px-8 pt-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg"><Bot className="h-5 w-5 text-primary" /></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-xl font-bold">Instruções de Movimento</CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-[9px] font-bold uppercase tracking-tighter rounded-lg bg-primary/5 hover:bg-primary/10 text-primary"
                                                    onClick={() => setConfig(prev => prev ? { ...prev, kanban_prompt: DEFAULT_PROMPT_TEMPLATE } : null)}
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-1" /> Resetar para Padrão
                                                </Button>
                                            </div>
                                            <CardDescription className="text-sm font-medium">Use tags como <code>{"{{TABELA_ESTAGIOS}}"}</code> para injetar dados dinâmicos.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-4 text-sm font-medium">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted px-2 py-0.5 rounded">Prompt de Decisão do Bot</Label>
                                    <Textarea
                                        className="min-h-[400px] rounded-2xl border-muted-foreground/10 focus:ring-primary/20 bg-background/50 font-mono text-xs leading-relaxed transition-all focus:bg-white p-6 shadow-inner"
                                        placeholder="Ex: Identifique o momento exato do lead. Se ele agendar uma reunião via texto, ele deve avançar. Se ele disser que já resolveu o problema, ele deve ir para Perdido..."
                                        value={config?.kanban_prompt || ''}
                                        onChange={(e) => setConfig(prev => prev ? { ...prev, kanban_prompt: e.target.value } : null)}
                                    />
                                    <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <div className="p-2 bg-blue-100 rounded-lg"><MessageSquare className="h-4 w-4 text-blue-600" /></div>
                                        <p className="text-[11px] text-blue-700 leading-normal">
                                            A IA vai ler **todo o histórico da conversa** e interpretar o momento do lead. Ela pode avançar ou regredir o lead em tempo real conforme a conversa flui.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden">
                                <CardHeader className="bg-purple-500/[0.02] border-b border-purple-500/5 pb-4 px-8 pt-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg"><Database className="h-5 w-5 text-purple-600" /></div>
                                        <div>
                                            <CardTitle className="text-xl font-bold">Atributos do Negócio</CardTitle>
                                            <CardDescription className="text-sm font-medium">Base de conhecimento para a classificação.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <Textarea
                                        className="min-h-[220px] rounded-2xl border-muted-foreground/10 bg-background/50 text-sm p-6 focus:bg-white transition-all shadow-inner"
                                        placeholder="Descreva o que seu negócio faz, quais são os critérios de um lead qualificado (ICP) e o que desqualifica um lead..."
                                        value={config?.knowledge_base || ''}
                                        onChange={(e) => setConfig(prev => prev ? { ...prev, knowledge_base: e.target.value } : null)}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden">
                                <CardHeader className="bg-orange-500/[0.02] border-b border-orange-500/5 pb-4 px-8 pt-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500/10 rounded-lg"><Settings2 className="h-5 w-5 text-orange-600" /></div>
                                        <CardTitle className="text-xl font-bold">API e Custos</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sua Gemini API Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="Cole sua chave API do Google aqui"
                                            className="rounded-2xl border-orange-500/10 bg-orange-500/[0.02] h-12 px-5 font-mono text-sm"
                                            value={config?.gemini_api_key || ''}
                                            onChange={(e) => setConfig(prev => prev ? { ...prev, gemini_api_key: e.target.value } : null)}
                                        />
                                        <p className="text-[9px] text-muted-foreground italic px-2">
                                            Seus custos de IA são pagos diretamente ao Google (Gemini 2.0 é ultra barato).
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Modelo de IA</Label>
                                        <Select
                                            value={config?.ai_settings.model}
                                            onValueChange={(val) => setConfig(prev => prev ? { ...prev, ai_settings: { ...prev.ai_settings, model: val } } : null)}
                                        >
                                            <SelectTrigger className="rounded-2xl h-12 px-5 border-muted-foreground/10 bg-muted/20">
                                                <SelectValue placeholder="Escolha um modelo" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Equilibrado)</SelectItem>
                                                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Max Inteligência)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="kanban" className="space-y-6 focus-visible:outline-none">
                    <Card className="rounded-3xl border shadow-sm bg-primary/5 overflow-hidden border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Ativação Nativa (Webhook)</h3>
                                        <p className="text-xs text-muted-foreground font-medium mt-1">Conecte seu GHL diretamente a este Hub sem precisar de n8n.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <div className="bg-white border border-primary/20 rounded-xl px-4 py-2 flex items-center gap-3 flex-1 md:flex-initial">
                                        <code className="text-[10px] font-mono font-bold text-primary/80 truncate max-w-[200px] lg:max-w-none">
                                            https://onanrpmrgdfjsrtwckxi.functions.supabase.co/ghl-ai-automator
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg hover:bg-primary/10"
                                            onClick={() => {
                                                navigator.clipboard.writeText("https://onanrpmrgdfjsrtwckxi.functions.supabase.co/ghl-ai-automator");
                                                toast({ title: "Copiado!", description: "URL do Webhook copiada para a área de transferência." });
                                            }}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="rounded-xl h-10 gap-2 text-[10px] font-bold uppercase tracking-widest bg-white border-primary/20"
                                        asChild
                                    >
                                        <a href="https://app.gohighlevel.com/" target="_blank" rel="noopener noreferrer">
                                            Configurar no GHL <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-dashed border-primary/10 flex items-start gap-3">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                    <strong>Como configurar:</strong> No GHL, crie uma Automação (Workflow), adicione o gatilho "Customer Replied" e a ação <strong>"Webhook (POST)"</strong> usando a URL acima. O Hub cuidará de ler o contexto e mover o card automaticamente.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden">
                        <CardHeader className="bg-blue-500/[0.02] border-b border-blue-500/5 p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg"><Zap className="h-5 w-5 text-blue-600" /></div>
                                        <CardTitle className="text-xl font-bold">Fluxo de Etapas (CRM)</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium">As instruções abaixo dizem à IA exatamente **quem** deve estar em cada estágio.</CardDescription>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pipeline Selecionado</Label>
                                        <Select
                                            value={config?.ghl_pipeline_id || ''}
                                            onValueChange={(val) => setConfig(prev => prev ? { ...prev, ghl_pipeline_id: val } : null)}
                                        >
                                            <SelectTrigger className="rounded-2xl h-11 w-[280px] border-primary/20 bg-primary/5 shadow-sm font-bold text-primary">
                                                <SelectValue placeholder={isLoadingGHL ? "Conectando..." : "Escolher Pipeline"} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                {pipelines.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="font-medium">{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateStageRules}
                                            disabled={isGeneratingRules || !config?.ghl_pipeline_id}
                                            className="rounded-2xl h-11 px-6 mt-5 border-blue-500/20 bg-blue-50/30 hover:bg-blue-100 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-2 shadow-sm"
                                        >
                                            {isGeneratingRules ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                                            Mágica do IA
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => fetchGHDPipelines(true)}
                                            disabled={isLoadingGHL}
                                            className="rounded-2xl h-11 px-4 mt-5 border-muted-foreground/10 hover:bg-muted/30 active:scale-95 transition-all shadow-sm"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isLoadingGHL ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 lg:p-12">
                            {ghlError && (
                                <div className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-8 animate-in zoom-in-95 duration-200">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p className="font-bold">{ghlError}</p>
                                </div>
                            )}

                            <div className="relative">
                                {/* Vertical Progress Line */}
                                <div className="absolute left-8 top-10 bottom-10 w-1 bg-gradient-to-b from-primary/40 via-blue-200/20 to-transparent rounded-full" />

                                <div className="space-y-10">
                                    {currentStages.length > 0 ? (
                                        currentStages.map((stage, idx) => {
                                            const stageData = config?.stage_mappings?.[stage.id] || { description: '', rule: '' };
                                            return (
                                                <div key={stage.id} className="relative pl-24 group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                                    {/* Stage Number Circle */}
                                                    <div className="absolute left-0 top-0 w-16 h-16 rounded-3xl bg-white border-4 border-primary/20 shadow-xl flex items-center justify-center transition-all group-hover:border-primary group-hover:scale-105 group-hover:shadow-primary/20">
                                                        <span className="text-xl font-black text-primary">{idx + 1}</span>
                                                    </div>

                                                    {/* Stage Card */}
                                                    <div className="bg-white rounded-3xl border border-muted-foreground/10 shadow-sm transition-all hover:shadow-md hover:border-primary/20 p-8 flex flex-col lg:flex-row lg:items-center gap-8 ring-1 ring-black/[0.02]">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-lg font-black tracking-tight text-foreground">{stage.name}</h3>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                                                            </div>
                                                            <div className="grid gap-6 md:grid-cols-2">
                                                                <div className="space-y-3">
                                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                                                        <Database className="h-3 w-3" /> Descrição da Etapa
                                                                    </Label>
                                                                    <Textarea
                                                                        className="min-h-[120px] w-full rounded-2xl border-muted-foreground/10 bg-muted/5 focus:bg-white text-xs font-semibold p-5 leading-relaxed transition-all focus:ring-primary/20"
                                                                        placeholder={`Descreva o que acontece nesta etapa ${stage.name}...`}
                                                                        value={stageData.description || ''}
                                                                        onChange={(e) => updateStageField(stage.id, 'description', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <Label className="text-[10px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2">
                                                                        <Zap className="h-3 w-3" /> Critérios de Movimentação
                                                                    </Label>
                                                                    <Textarea
                                                                        className="min-h-[120px] w-full rounded-2xl border-muted-foreground/10 bg-muted/5 focus:bg-white text-xs font-semibold p-5 leading-relaxed transition-all focus:ring-primary/20"
                                                                        placeholder={`O que o lead deve falar ou fazer para ser movido para ${stage.name}?`}
                                                                        value={stageData.rule || ''}
                                                                        onChange={(e) => updateStageField(stage.id, 'rule', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="lg:w-1/4 flex flex-col items-center justify-center p-6 bg-primary/[0.02] rounded-2xl border border-primary/5">
                                                            <div className="p-3 bg-primary/10 rounded-full mb-3">
                                                                <Bot className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <p className="text-[11px] font-bold text-center text-primary/70 leading-relaxed">
                                                                A IA move o lead para aqui se as instruções acima forem atendidas.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-24 border-4 border-dashed rounded-[40px] bg-muted/5 text-muted-foreground">
                                            <div className="p-6 bg-white rounded-3xl shadow-sm mb-6 opacity-30">
                                                <Zap className="h-12 w-12 text-primary" />
                                            </div>
                                            <p className="font-bold text-lg">Funil não configurado</p>
                                            <p className="text-sm">Selecione um Pipeline acima para carregar as etapas.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="simulacao" className="space-y-6 focus-visible:outline-none">
                    <div className="grid gap-6 lg:grid-cols-5 h-[calc(100vh-280px)] min-h-[600px]">
                        {/* Chat Area */}
                        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                            <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden flex flex-col flex-1">
                                <CardHeader className="bg-primary/[0.02] border-b border-primary/5 pb-4 px-8 pt-8 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg"><MessageSquare className="h-5 w-5 text-primary" /></div>
                                            <div>
                                                <CardTitle className="text-xl font-bold">Simulador de Chat</CardTitle>
                                                <CardDescription className="text-sm font-medium">As mensagens do Lead disparam a análise da IA.</CardDescription>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearSimulation}
                                            className="text-muted-foreground hover:text-destructive gap-2 rounded-xl"
                                        >
                                            <Trash2 className="h-4 w-4" /> Limpar Tudo
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 overflow-y-auto space-y-4 bg-muted/5 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                                    {chatHistory.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 space-y-2">
                                            <Bot className="h-10 w-10 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Inicie a conversa para testar o fluxo</p>
                                        </div>
                                    )}
                                    {chatHistory.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.role === 'lead' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                        >
                                            <div className={`max-w-[80%] flex items-start gap-3 ${msg.role === 'lead' ? 'flex-row' : 'flex-row-reverse'}`}>
                                                <div className={`p-2 rounded-xl shrink-0 ${msg.role === 'lead' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    {msg.role === 'lead' ? <User className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                                                </div>
                                                <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm border ${msg.role === 'lead'
                                                    ? 'bg-white border-primary/10 rounded-tl-none'
                                                    : 'bg-primary text-white border-primary rounded-tr-none'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isSimulating && (
                                        <div className="flex justify-start animate-pulse">
                                            <div className="bg-white border rounded-2xl p-4 flex items-center gap-3">
                                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">IA Analisando...</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="p-6 bg-white border-t shrink-0">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl w-fit border">
                                            <Button
                                                variant={simulationRole === 'lead' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setSimulationRole('lead')}
                                                className={`rounded-lg gap-2 text-[10px] font-bold h-8 ${simulationRole === 'lead' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground'}`}
                                            >
                                                <User className="h-3 w-3" /> LEAD
                                            </Button>
                                            <Button
                                                variant={simulationRole === 'agent' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setSimulationRole('agent')}
                                                className={`rounded-lg gap-2 text-[10px] font-bold h-8 ${simulationRole === 'agent' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground'}`}
                                            >
                                                <UserCog className="h-3 w-3" /> ATENDENTE
                                            </Button>
                                        </div>
                                        <div className="flex gap-3">
                                            <Input
                                                value={simulationInput}
                                                onChange={(e) => setSimulationInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder={simulationRole === 'lead' ? "Fale como o Lead..." : "Fale como o Atendente..."}
                                                className="rounded-2xl h-12 shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                                            />
                                            <Button
                                                onClick={handleSendMessage}
                                                className="rounded-2xl h-12 w-12 shrink-0 bg-primary text-white shadow-xl shadow-primary/20 p-0"
                                            >
                                                <Send className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Logs and Movement History Area */}
                        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                            {/* Current Stage Status */}
                            <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden shrink-0">
                                <CardHeader className="bg-green-500/[0.02] border-b border-green-500/5 p-6">
                                    <Label className="text-[10px] font-black uppercase text-green-600 tracking-widest">Estágio Atual na Simulação</Label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="p-2 bg-green-500 rounded-xl text-white shadow-md">
                                            <Zap className="h-4 w-4" />
                                        </div>
                                        <h3 className="text-xl font-black text-green-900 leading-tight">
                                            {currentSimulatedStage?.name || 'Aguardando Início'}
                                        </h3>
                                    </div>
                                </CardHeader>
                            </Card>

                            {/* Movement History / Timeline */}
                            <Card className="rounded-3xl border shadow-sm bg-white overflow-hidden flex-1 flex flex-col">
                                <CardHeader className="border-b bg-muted/10 p-6 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><History className="h-4 w-4" /></div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-widest">Gatilhos de Movimento</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
                                    {movementLogs.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground/40 space-y-2">
                                            <ArrowRight className="h-8 w-8 mx-auto opacity-20 mb-2" />
                                            <p className="text-xs font-bold uppercase">Nenhum movimento registrado</p>
                                        </div>
                                    )}
                                    {movementLogs.map((log, idx) => (
                                        <div key={idx} className="relative pl-6 border-l-2 border-primary/20 space-y-3">
                                            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    Gatilho: <span className="text-foreground normal-case italic">"{log.triggerMessage}"</span>
                                                </p>
                                                <div className="flex items-center gap-2 text-xs font-bold">
                                                    <span className="text-muted-foreground">{log.fromStageName}</span>
                                                    <ArrowRight className="h-3 w-3 text-primary" />
                                                    <span className="text-primary">{log.toStageName}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-muted/40 rounded-xl border text-[11px] font-medium italic text-muted-foreground">
                                                "{log.reasoning}"
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
