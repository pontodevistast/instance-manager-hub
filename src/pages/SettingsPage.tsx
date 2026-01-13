import { useState, useEffect } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Eye, EyeOff, Globe, ShieldCheck, Link2 } from 'lucide-react';

export default function SettingsPage() {
  const { locationId } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    api_base_url: 'https://api.uazapi.com',
    global_api_token: '',
    webhook_url: '',
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!locationId) return;
      try {
        const { data, error } = await supabase
          .from('integration_settings')
          .select('*')
          .eq('location_id', locationId)
          .maybeSingle();

        if (data) {
          setConfig({
            api_base_url: data.api_base_url || 'https://api.uazapi.com',
            global_api_token: data.global_api_token || '',
            webhook_url: data.webhook_url || '',
          });
        }
      } catch (err) {
        console.error('Erro ao buscar settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [locationId]);

  const handleSave = async () => {
    if (!locationId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          location_id: locationId,
          api_base_url: config.api_base_url,
          global_api_token: config.global_api_token,
          webhook_url: config.webhook_url,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Configurações de infraestrutura salvas.',
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

  const testConnection = async () => {
    setIsTesting(true);
    try {
      // Simulação de ping na API
      const response = await fetch(`${config.api_base_url}/instance/status`, {
        method: 'GET',
        headers: { 'apikey': config.global_api_token }
      }).catch(() => null);

      if (response) {
        toast({ title: 'Conexão Ativa', description: 'A URL da API respondeu corretamente.' });
      } else {
        toast({ title: 'Atenção', description: 'Não foi possível alcançar a URL da API.', variant: 'destructive' });
      }
    } finally {
      setIsTesting(false);
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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações de Infraestrutura</h1>
          <p className="text-muted-foreground">Configure os dados mestre para criação de instâncias nesta subconta.</p>
        </div>
        <Button variant="outline" size="sm" onClick={testConnection} disabled={isTesting}>
          {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          Testar Conexão
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Servidor de Mensageria
          </CardTitle>
          <CardDescription>Defina onde as instâncias serão hospedadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL Base da API</Label>
            <Input 
              placeholder="https://api.uazapi.com" 
              value={config.api_base_url}
              onChange={(e) => setConfig({...config, api_base_url: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Token Global de Admin</Label>
            <div className="relative">
              <Input 
                type={showToken ? "text" : "password"}
                placeholder="Token mestre do servidor" 
                value={config.global_api_token}
                onChange={(e) => setConfig({...config, global_api_token: e.target.value})}
                className="pr-10"
              />
              <button 
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Webhook de Retorno
          </CardTitle>
          <CardDescription>URL que receberá os eventos do WhatsApp (opcional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <Input 
              placeholder="https://seu-n8n.com/webhook/..." 
              value={config.webhook_url}
              onChange={(e) => setConfig({...config, webhook_url: e.target.value})}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="px-8">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}