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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Info, Check, User } from 'lucide-react';
import { listGHLUsers } from '@/lib/ghl';
import { uazapiFetch } from '@/lib/uazapi';
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
  const [selectedRemotes, setSelectedRemotes] = useState<RemoteInstance[]>([]);
  const [remoteInstances, setRemoteInstances] = useState<RemoteInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [mode, setMode] = useState<'new' | 'import'>('new');
  const [ghlUserId, setGhlUserId] = useState('none');
  const [ghlUsers, setGhlUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(locationId);

  useEffect(() => {
    if (mode === 'import' && open && config?.api_base_url && config?.api_token) {
      fetchRemoteInstances();
    }
  }, [mode, open, config]);

  useEffect(() => {
    async function fetchUsers() {
      if (open && config?.ghl_token && locationId) {
        setIsLoadingUsers(true);
        try {
          const { data: agencyData } = await supabase
            .from('ghl_agency_tokens')
            .select('access_token')
            .limit(1)
            .single();

          const users = await listGHLUsers(config.ghl_token, locationId, agencyData?.access_token || undefined);
          setGhlUsers(users);
        } catch (err: any) {
          console.error('Erro ao carregar usuários:', err);
          toast({
            title: 'Erro ao carregar usuários GHL',
            description: err.message,
            variant: 'destructive'
          });
        } finally {
          setIsLoadingUsers(false);
        }
      }
    }
    fetchUsers();
  }, [open, config?.ghl_token, locationId]);

  const fetchRemoteInstances = async () => {
    if (!config?.api_base_url) return;
    setIsLoadingRemote(true);
    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/all', {
        adminToken: config.api_token || undefined
      });

      const list = (Array.isArray(data) ? data : (data.instances || [])) as RemoteInstance[];

      const { data: allLinked } = await supabase
        .from('instances')
        .select('instance_token');

      const linkedTokens = new Set(allLinked?.map(i => i.instance_token) || []);
      const filtered = list.filter((remote) => !linkedTokens.has(remote.token));
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

  const toggleSelection = (remote: RemoteInstance) => {
    setSelectedRemotes(prev => {
      const isSelected = prev.find(i => i.token === remote.token);
      if (isSelected) {
        return prev.filter(i => i.token !== remote.token);
      } else {
        return [...prev, remote];
      }
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'new') {
        if (!name.trim()) throw new Error('Nome obrigatório.');
        const data = await uazapiFetch(config!.api_base_url!, '/instance/init', {
          method: 'POST',
          adminToken: config!.api_token || undefined,
          body: {
            name: name.trim(),
            systemName: systemName || 'uazapiGO',
            adminField01: locationId,
            fingerprintProfile: "chrome",
            browser: "chrome"
          }
        });

        const finalInstanceToken = data.token || data.instance?.token;

        const { error: dbError } = await supabase.from('instances').insert({
          location_id: locationId,
          instance_name: name.trim(),
          instance_token: finalInstanceToken,
          status: 'disconnected',
          ghl_user_id: ghlUserId === 'none' ? null : ghlUserId
        });

        if (dbError) throw dbError;
      } else {
        if (selectedRemotes.length === 0) throw new Error('Selecione pelo menos uma instância.');

        const inserts = selectedRemotes.map(remote => ({
          location_id: locationId,
          instance_name: remote.name,
          instance_token: remote.token,
          status: 'disconnected',
          ghl_user_id: ghlUserId === 'none' ? null : ghlUserId
        }));

        const { error: dbError } = await supabase.from('instances').insert(inserts);

        if (dbError) throw dbError;
      }

      toast({ title: 'Sucesso', description: mode === 'new' ? 'Instância criada!' : `${selectedRemotes.length} instâncias vinculadas!` });
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

          <Tabs defaultValue="new" className="w-full mt-4" onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Criar Nova</TabsTrigger>
              <TabsTrigger value="import">Importar</TabsTrigger>
            </TabsList>

            <div className="py-4 min-h-[220px]">
              <TabsContent value="new" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Instância</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vendas" required={mode === 'new'} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">System Name <Info className="h-3 w-3" /></Label>
                  <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} className="font-mono text-xs" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-3 w-3" /> Usuário GHL (Opcional)
                  </Label>
                  <Select value={ghlUserId} onValueChange={setGhlUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Vincular um usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum usuário</SelectItem>
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin mr-2" /> Carregando...
                        </div>
                      ) : (
                        ghlUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="import" className="m-0 space-y-4">
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
                        {remoteInstances.map((remote) => {
                          const isSelected = selectedRemotes.find(i => i.token === remote.token);
                          return (
                            <div
                              key={remote.token}
                              onClick={() => toggleSelection(remote)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                                isSelected ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/50"
                              )}
                            >
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold truncate">{remote.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">{remote.token}</p>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isLoading || (mode === 'new' ? !name.trim() : selectedRemotes.length === 0)}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {mode === 'new' ? 'Criar Instância' : `Vincular ${selectedRemotes.length > 0 ? selectedRemotes.length : ''} Instâncias`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}