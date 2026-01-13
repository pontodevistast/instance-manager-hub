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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { useInstances } from '@/hooks/use-instances';
import { Loader2, Plus, Link2, Info, Smartphone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs as TabsRoot, TabsContent as TContent, TabsList as TList, TabsTrigger as TTrigger } from '@/components/ui/tabs';

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

      if (!response.ok) throw new Error('Falha ao buscar instâncias.');
      
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.instances || []);
      
      // Filtra as que já estão vinculadas a ESTA subconta
      const localTokens = localInstances.map(i => i.instance_token);
      const filtered = list.filter((remote: RemoteInstance) => !localTokens.includes(remote.token));
      
      setRemoteInstances(filtered);
    } catch (error: any) {
      toast({ title: 'Erro de Busca', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingRemote(false);
    }
  };

  useEffect(() => {
    if (mode === 'new' && name) {
      const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').substring(0, 15);
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
        if (!name.trim()) throw new Error('Nome obrigatório.');
        const response = await fetch(`${config?.api_base_url}/instance/init`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'admintoken': config?.api_token || ''
          },
          body: JSON.stringify({
            name: name.trim(),
            systemName: systemName || 'uazapiGO',
            adminField01: locationId,
            fingerprintProfile: "chrome",
            browser: "chrome"
          })
        });

        if (!response.ok) throw new Error('Erro ao criar no servidor.');
        const data = await response.json();
        finalInstanceToken = data.token || data.instance?.token;
        finalName = name.trim();
      } else {
        if (!selectedRemote) throw new Error('Selecione uma instância.');
        finalInstanceToken = selectedRemote.token;
        finalName = selectedRemote.name;
      }

      const { error: dbError } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: finalName,
        instance_token: finalInstanceToken,
        status: 'disconnected',
      });

      if (dbError) throw dbError;

      toast({ title: 'Sucesso', description: 'Instância vinculada!' });
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
            <DialogDescription>Crie uma nova ou vincule uma existente.</DialogDescription>
          </DialogHeader>

          <TabsRoot defaultValue="new" className="w-full mt-4" onValueChange={(v) => setMode(v as any)}>
            <TList className="grid w-full grid-cols-2">
              <TTrigger value="new">Criar Nova</TTrigger>
              <TTrigger value="import">Importar</TTrigger>
            </TList>
            
            <div className="py-4 min-h-[220px]">
              <TContent value="new" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Instância</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vendas" required={mode === 'new'} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">System Name <Info className="h-3 w-3" /></Label>
                  <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} className="font-mono text-xs" />
                </div>
              </TContent>

              <TContent value="import" className="m-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Instâncias no Servidor</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={fetchRemoteInstances} disabled={isLoadingRemote}>
                      {isLoadingRemote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Atualizar
                    </Button>
                  </div>
                  <ScrollArea className="h-[180px] w-full border rounded-md p-2 bg-muted/20">
                    {isLoadingRemote ? (
                      <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : (
                      <div className="space-y-1">
                        {remoteInstances.map((remote) => (
                          <div
                            key={remote.token}
                            onClick={() => setSelectedRemote(remote)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
                              selectedRemote?.token === remote.token ? "bg-primary/10 border-primary" : "bg-card"
                            )}
                          >
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate">{remote.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">{remote.token}</p>
                            </div>
                            {selectedRemote?.token === remote.token && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TContent>
            </div>
          </TabsRoot>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isLoading || (mode === 'new' ? !name.trim() : !selectedRemote)}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {mode === 'new' ? 'Criar Instância' : 'Vincular Selecionada'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}