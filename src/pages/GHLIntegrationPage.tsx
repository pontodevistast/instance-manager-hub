import { useState, useEffect } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { uazapiFetch } from '@/lib/uazapi';
import { Loader2, Save, Globe, Shield, Activity } from 'lucide-react';

export default function GHLIntegrationPage() {
  const { locationId } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [config, setConfig] = useState({
    ghl_token: '',
    account_name: '',
    api_base_url: 'https://kanbro.uazapi.com',
    api_token: '',
    ignore_groups: true,
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!locationId) return;
      try {
        // 1. Fetch Global Settings
        const { data: globalData } = await supabase
          .from('integration_settings')
          .select('*')
          .eq('location_id', 'agency')
          .maybeSingle();

        // 2. Fetch Location Settings
        const { data: localData } = await supabase
          .from('ghl_uazapi_config')
          .select('*')
          .eq('location_id', locationId)
          .maybeSingle();

        if (localData) {
          setConfig({
            ghl_token: localData.ghl_token || import.meta.env.VITE_GHL_TOKEN || '',
            account_name: localData.account_name || '',
            api_base_url: localData.api_base_url || import.meta.env.VITE_UAZAPI_BASE_URL || globalData?.api_base_url || 'https://kanbro.uazapi.com',
            api_token: localData.api_token || import.meta.env.VITE_UAZAPI_ADMIN_TOKEN || globalData?.global_api_token || '',
            ignore_groups: localData.ignore_groups ?? true,
          });
        } else if (globalData || import.meta.env.VITE_UAZAPI_BASE_URL) {
          setConfig(prev => ({
            ...prev,
            api_base_url: import.meta.env.VITE_UAZAPI_BASE_URL || globalData?.api_base_url || prev.api_base_url,
            api_token: import.meta.env.VITE_UAZAPI_ADMIN_TOKEN || globalData?.global_api_token || '',
          }));
        }

        // Fetch Webhook Global if available
        const effectiveUrl = localData?.api_base_url || import.meta.env.VITE_UAZAPI_BASE_URL || globalData?.api_base_url;
        const effectiveToken = localData?.api_token || import.meta.env.VITE_UAZAPI_ADMIN_TOKEN || globalData?.global_api_token;

        if (effectiveUrl && effectiveToken) {
          try {
            const hookData = await uazapiFetch(effectiveUrl, '/globalwebhook', {
              adminToken: effectiveToken
            });
            setWebhookUrl(hookData.url || '');
          } catch (e) {
            console.warn('Falha ao buscar webhook:', e);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar config:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [locationId]);

  const handleSaveAll = async () => {
    if (!locationId) return;
    setIsSaving(true);
    try {
      // 1. Salvar no Supabase
      const { error } = await supabase
        .from('ghl_uazapi_config')
        .upsert({
          location_id: locationId,
          ghl_token: config.ghl_token,
          account_name: config.account_name,
          api_base_url: config.api_base_url,
          api_token: config.api_token,
          ignore_groups: config.ignore_groups,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id' });

      if (error) throw error;

      // 2. Salvar Webhook Global via API UaZapi
      if (config.api_base_url && config.api_token && webhookUrl) {
        await uazapiFetch(config.api_base_url, '/globalwebhook', {
          method: 'POST',
          adminToken: config.api_token,
          body: {
            url: webhookUrl,
            events: ["messages", "connection"],
            excludeMessages: ["wasSentByApi"]
          }
        });
      }

      toast({ title: 'Configurações Salvas', description: 'Dados locais e servidor sincronizados.' });
    } catch (err: any) {
      toast({ title: 'Erro ao Salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integração & Servidor</h1>
          <p className="text-muted-foreground">Configure os dados do GHL e as definições globais do UaZapi.</p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Tudo
        </Button>
      </div>

      <Tabs defaultValue="creds" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="creds">Credenciais</TabsTrigger>
          <TabsTrigger value="webhook">Webhook Global</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
        </TabsList>

        <TabsContent value="creds" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Subconta GoHighLevel</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Location ID</Label>
                  <Input value={locationId || ''} disabled className="bg-muted font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Bearer Token</Label>
                  <Input type="password" value={config.ghl_token} onChange={(e) => setConfig({ ...config, ghl_token: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API UaZapi (Servidor)</CardTitle>
                <CardDescription className="text-[10px] text-blue-600 dark:text-blue-400 font-medium italic">
                  * Estes campos são preenchidos automaticamente pelas Configurações Globais se vazios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input
                    value={config.api_base_url}
                    onChange={(e) => setConfig({ ...config, api_base_url: e.target.value })}
                    placeholder="Herdado do Global"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Token (Opcional)</Label>
                  <Input
                    type="password"
                    value={config.api_token}
                    onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                    placeholder="Preencha apenas se quiser sobrescrever o Global"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhook" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" /> Webhook Global
              </CardTitle>
              <CardDescription>URL que receberá todos os eventos de mensagens e conexão do servidor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input
                  placeholder="https://sua-url.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border text-xs space-y-2">
                <p className="font-bold flex items-center gap-2"><Activity className="h-3 w-3" /> Eventos Monitorados:</p>
                <ul className="list-disc list-inside text-muted-foreground ml-2">
                  <li>messages (Mensagens recebidas/enviadas)</li>
                  <li>connection (Status da bateria/rede)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Segurança & Comportamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ignorar Mensagens de Grupos</Label>
                  <p className="text-sm text-muted-foreground">Não processa mensagens vindas de chats coletivos.</p>
                </div>
                <Switch
                  checked={config.ignore_groups}
                  onCheckedChange={(checked) => setConfig({ ...config, ignore_groups: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}