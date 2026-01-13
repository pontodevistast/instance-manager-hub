import { useState, useEffect } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ExternalLink } from 'lucide-react';

export default function GHLIntegrationPage() {
  const { locationId } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    ghl_token: '',
    account_name: '',
    api_base_url: 'https://api.uazapi.com',
    api_token: '',
    ignore_groups: true,
    responder_com_instacia: false,
  });

  useEffect(() => {
    async function fetchConfig() {
      if (!locationId) return;
      try {
        const { data, error } = await supabase
          .from('ghl_uazapi_config')
          .select('*')
          .eq('location_id', locationId)
          .single();

        if (data) {
          setConfig({
            ghl_token: data.ghl_token || '',
            account_name: data.account_name || '',
            api_base_url: data.api_base_url || 'https://api.uazapi.com',
            api_token: data.api_token || '',
            ignore_groups: data.ignore_groups ?? true,
            responder_com_instacia: data.responder_com_instacia ?? false,
          });
        }
      } catch (err) {
        console.error('Erro ao buscar config GHL:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, [locationId]);

  const handleSave = async () => {
    if (!locationId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ghl_uazapi_config')
        .upsert({
          location_id: locationId,
          ...config,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id' });

      if (error) throw error;

      toast({
        title: 'Configuração salva',
        description: 'As definições de integração foram atualizadas com sucesso.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integração GoHighLevel</h1>
        <p className="text-muted-foreground">Configure os dados globais da sua subconta GHL</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">GoHighLevel (GHL)</CardTitle>
            <CardDescription>Credenciais da subconta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Location ID</Label>
              <Input value={locationId || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Bearer Token</Label>
              <Input 
                type="password"
                placeholder="Token de acesso GHL" 
                value={config.ghl_token}
                onChange={(e) => setConfig({...config, ghl_token: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome de Exibição</Label>
              <Input 
                placeholder="Ex: Unidade Centro" 
                value={config.account_name}
                onChange={(e) => setConfig({...config, account_name: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Servidor UaZapi</CardTitle>
            <CardDescription>Configurações globais da API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input 
                placeholder="https://api.uazapi.com" 
                value={config.api_base_url}
                onChange={(e) => setConfig({...config, api_base_url: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Global API Token</Label>
              <Input 
                type="password"
                placeholder="Token mestre do servidor" 
                value={config.api_token}
                onChange={(e) => setConfig({...config, api_token: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comportamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ignorar Grupos</Label>
              <p className="text-sm text-muted-foreground">Evita processar mensagens vindas de grupos.</p>
            </div>
            <Switch 
              checked={config.ignore_groups}
              onCheckedChange={(checked) => setConfig({...config, ignore_groups: checked})}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Forçar Respostas</Label>
              <p className="text-sm text-muted-foreground">Responder sempre por esta subconta no GHL.</p>
            </div>
            <Switch 
              checked={config.responder_com_instacia}
              onCheckedChange={(checked) => setConfig({...config, responder_com_instacia: checked})}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}