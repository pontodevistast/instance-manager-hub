import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { useInstances } from '@/hooks/use-instances';
import { Loader2, Plus, Link2, Info, Smartphone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onSuccess: () => void;
}

interface RemoteInstance {
  name: string;
  token: string;
  status: string;
  systemName?: string;
}

export function AddInstanceDialog({ open, onOpenChange, locationId, onSuccess }: AddInstanceDialogProps) {
  const [name, setName] = useState('');
  const [systemName, setSystemName] = useState('');
  const [selectedRemote, setSelectedRemote] = useState<RemoteInstance | null>(null);
  const [remoteInstances, setRemoteInstances] = useState<RemoteInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [mode, setMode] = useState<'new' | 'import'>('new');
  
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(locationId);
  const { instances: localInstances } = useInstances(locationId);

  // Busca instâncias do servidor quando o modo Importar é ativado
  useEffect(() => {
    if (mode === 'import' && open && config?.api_base_url && config?.api_token) {
      fetchRemoteInstances();
    }
  }, [mode, open, config]);

  const fetchRemoteInstances = async () => {
    setIsLoadingRemote(true);
    try {
      const response = await fetch(`${config?.api_base_url}/instance/all`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'admintoken': config?.api_token || ''
        }
      });

      if (!response.ok) throw new Error('Falha ao buscar instâncias no servidor.');
      
      const data = await response.json();
      // data pode ser um array direto ou estar dentro de uma propriedade
      const list = Array.isArray(data) ? data : (data.instances || []);
      
      // Filtrar apenas as que não existem localmente para evitar duplicados
      const localTokens = localInstances.map(i => i.instance_token);
      const filtered = list.filter((remote: RemoteInstance) => !localTokens.includes(remote.token));
      
      setRemoteInstances(filtered);
    } catch (error: any) {
      toast({ title: 'Erro de Busca', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingRemote(false);
    }
  };

  // Gera o System Name automaticamente
  useEffect(() => {
    if (mode === 'new' && name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);
      setSystemName(slug);
    }
  }, [name, mode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      let finalInstanceToken = '';
      let finalName = '';

      if (mode === 'new') {
        if (!name.trim()) throw new Error('O nome é obrigatório.');
        if (!config?.api_token || !config?.api_base_url) throw new Error('Configuração de API incompleta.');

        const response = await fetch(`${config.api_base_url}/instance/init`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'admintoken': config.api_token
          },
          body: JSON.stringify({
            name: name.trim(),
            systemName: systemName || 'uazapiGO',
            adminField01: locationId,
            fingerprintProfile: "chrome",
            browser: "chrome"
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Erro ao criar instância no servidor.');
        }

        const data = await response.json();
        finalInstanceToken = data.token || data.instance?.token;
        finalName = name.trim();
      } else {
        // Modo Importar
        if (!selectedRemote) throw new Error('Selecione uma instância para importar.');
        finalInstanceToken = selectedRemote.token;
        finalName = selectedRemote.name;
      }

      if (!finalInstanceToken) throw new Error('Token inválido.');

      // 2. Salvar no Supabase
      const { error: dbError } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: finalName,
        instance_token: finalInstanceToken,
        status: 'disconnected',
      });

      if (dbError) throw dbError;

      toast({ title: 'Sucesso', description: mode === 'new' ? 'Instância criada!' : 'Instância vinculada!' });
      
      setName('');
      setSystemName('');
      setSelectedRemote(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Adicionar WhatsApp</DialogTitle>
            <DialogDescription>
              Crie uma nova ou vincule uma existente no servidor.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new" className="w-full mt-4" onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Criar Nova</TabsTrigger>
              <TabsTrigger value="import">Importar</TabsTrigger>
            </TabsList>
            
            <div className="py-4 min-h-[220px]">
              <TabsContent value="new" className="m-0 space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Instância</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Vendas"
                    required={mode === 'new'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sysName" className="flex items-center gap-2">
                    System Name
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="sysName"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    placeholder="uazapiGO"
                    className="font-mono text-xs"
                  />
                </div>
              </TabsContent>

              <TabsContent value="import" className="m-0 space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Instâncias no Servidor</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px]" 
                      onClick={fetchRemoteInstances}
                      disabled={isLoadingRemote}
                    >
                      {isLoadingRemote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Atualizar Lista
                    </Button>
                  </div>

                  <ScrollArea className="h-[180px] w-full border rounded-md p-2 bg-muted/20">
                    {isLoadingRemote ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-xs">Buscando no servidor...</span>
                      </div>
                    ) : remoteInstances.length > 0 ? (
                      <div className="space-y-1">
                        {remoteInstances.map((remote) => (
                          <div
                            key={remote.token}
                            onClick={() => setSelectedRemote(remote)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                              selectedRemote?.token === remote.token 
                                ? "bg-primary/10 border-primary ring-1 ring-primary" 
                                : "bg-card hover:bg-muted/50 border-border"
                            )}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <Smartphone className={cn("h-4 w-4", selectedRemote?.token === remote.token ? "text-primary" : "text-muted-foreground")} />
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold truncate">{remote.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">{remote.token}</p>
                              </div>
                            </div>
                            {selectedRemote?.token === remote.token && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <p className="text-xs text-muted-foreground">Nenhuma instância disponível para importar no servidor.</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || (mode === 'new' ? !name.trim() : !selectedRemote)}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : mode === 'new' ? <Plus className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              {mode === 'new' ? 'Criar Instância' : 'Vincular Selecionada'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}