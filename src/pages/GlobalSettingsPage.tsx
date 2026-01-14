import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Shield, Database, Key } from 'lucide-react';

export default function GlobalSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const [settings, setSettings] = useState({
        api_base_url: 'https://api.uazapi.com',
        global_api_token: '',
        ghl_client_id: '',
        ghl_client_secret: '',
        webhook_url: '',
    });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const { data, error } = await supabase
                    .from('integration_settings')
                    .select('*')
                    .eq('location_id', 'agency')
                    .maybeSingle();

                if (data) {
                    setSettings({
                        api_base_url: data.api_base_url || 'https://api.uazapi.com',
                        global_api_token: data.global_api_token || '',
                        ghl_client_id: data.ghl_client_id || '',
                        ghl_client_secret: data.ghl_client_secret || '',
                        webhook_url: data.webhook_url || '',
                    });
                }
            } catch (err) {
                console.error('Erro ao buscar configurações globais:', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('integration_settings')
                .upsert({
                    location_id: 'agency',
                    api_base_url: settings.api_base_url,
                    global_api_token: settings.global_api_token,
                    ghl_client_id: settings.ghl_client_id,
                    ghl_client_secret: settings.ghl_client_secret,
                    webhook_url: settings.webhook_url,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'location_id' });

            if (error) throw error;

            toast({ title: 'Configurações Salvas', description: 'Credenciais globais de agência foram atualizadas.' });
        } catch (err: any) {
            toast({ title: 'Erro ao Salvar', description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary/40" /></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Configurações Globais</h1>
                    <p className="text-muted-foreground">Gerencie credenciais de nível Agência que afetam todas as subcontas.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="rounded-xl shadow-lg h-11 px-8">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="grid gap-8">
                <Card className="rounded-2xl border-2">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Database className="h-5 w-5 text-indigo-600" /> Servidor UaZapi (Global)
                        </CardTitle>
                        <CardDescription>Estes dados serão usados como padrão para todas as instâncias se não houver configuração específica.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="apiUrl">API Base URL</Label>
                                <Input
                                    id="apiUrl"
                                    value={settings.api_base_url}
                                    onChange={(e) => setSettings({ ...settings, api_base_url: e.target.value })}
                                    placeholder="https://apiUrl.uazapi.com"
                                    className="h-11 rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="apiToken">Admin Token (Mestre)</Label>
                                <Input
                                    id="apiToken"
                                    type="password"
                                    value={settings.global_api_token}
                                    onChange={(e) => setSettings({ ...settings, global_api_token: e.target.value })}
                                    placeholder="Token administrativo do servidor"
                                    className="h-11 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="webhookUrl">Webhook de Auditoria Global</Label>
                            <Input
                                id="webhookUrl"
                                value={settings.webhook_url}
                                onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                                placeholder="https://sua-url.com/webhook-master"
                                className="h-11 rounded-lg"
                            />
                            <p className="text-[10px] text-muted-foreground italic">Recebe logs de todas as instâncias do servidor.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-2">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Key className="h-5 w-5 text-indigo-600" /> GoHighLevel OAuth (Marketplace)
                        </CardTitle>
                        <CardDescription>Credenciais do seu aplicativo no marketplace do GoHighLevel.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="clientId">Client ID</Label>
                                <Input
                                    id="clientId"
                                    value={settings.ghl_client_id}
                                    onChange={(e) => setSettings({ ...settings, ghl_client_id: e.target.value })}
                                    placeholder="Seu GHL Client ID"
                                    className="h-11 rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clientSecret">Client Secret</Label>
                                <Input
                                    id="clientSecret"
                                    type="password"
                                    value={settings.ghl_client_secret}
                                    onChange={(e) => setSettings({ ...settings, ghl_client_secret: e.target.value })}
                                    placeholder="Seu GHL Client Secret"
                                    className="h-11 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200/50 flex gap-3">
                            <Shield className="h-5 w-5 text-amber-600 shrink-0" />
                            <div className="text-xs text-amber-700 dark:text-amber-400">
                                <p className="font-bold border-b border-amber-200 pb-1 mb-1">Configuração Obrigatória:</p>
                                <p>Certifique-se de que a **Redirect URI** configurada no GHL seja:</p>
                                <code className="bg-white/80 p-1 rounded mt-1 block font-mono">
                                    {window.location.origin}/callback
                                </code>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
