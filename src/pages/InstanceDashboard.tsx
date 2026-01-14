import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocation } from '@/contexts/LocationContext';
import { useInstances } from '@/hooks/use-instances';
import { StatusBadge } from '@/components/StatusBadge';
import { Smartphone, CheckCircle2, QrCode, Zap, Loader2, Info, Unplug, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectDialog } from '@/components/ConnectDialog';
import { useToast } from '@/hooks/use-toast';
import { useInstanceActions } from '@/hooks/use-instance-actions';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import type { Instance } from '@/types/instance';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uazapiFetch } from '@/lib/uazapi';
import { listGHLUsers } from '@/lib/ghl';
import { supabase } from '@/integrations/supabase/client';


export default function InstanceDashboard() {
  const { locationId } = useLocation();
  const { instances, isLoading, refetch } = useInstances(locationId);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isIframe = searchParams.get('iframe') === 'true';
  const { data: config } = useSubaccountConfig(locationId);
  const { handleLogout, isDisconnecting } = useInstanceActions(locationId);
  const [ghlUsers, setGhlUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingInstanceId, setUpdatingInstanceId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      if (config?.ghl_token && locationId) {
        setIsLoadingUsers(true);
        try {
          const users = await listGHLUsers(config.ghl_token, locationId);
          setGhlUsers(users);
        } catch (err) {
          console.error('Erro ao carregar usuários no dashboard:', err);
        } finally {
          setIsLoadingUsers(false);
        }
      }
    }
    fetchUsers();
  }, [config?.ghl_token, locationId]);

  const handleUserLink = async (instance: Instance, userId: string) => {
    if (!config?.api_base_url) return;
    setUpdatingInstanceId(instance.id);

    try {
      // 1. Resolve Server ID (required for UaZapi updates)
      let serverId: string | undefined;
      try {
        const allInstances = await uazapiFetch(config.api_base_url, '/instance/all', {
          adminToken: config.api_token || undefined
        });
        const instanceList = (Array.isArray(allInstances) ? allInstances : (allInstances.instances || [])) as any[];
        const remoteInstance = instanceList.find((i: any) => i.token === instance.instance_token);
        serverId = remoteInstance?.id;
      } catch (e) {
        console.warn('Falha ao resolver Server ID para update de usuário:', e);
      }

      // 2. Update UaZapi Admin Fields (if serverId found)
      // We try this but don't block if it fails, as local link is priority
      if (serverId) {
        try {
          await uazapiFetch(config.api_base_url, '/instance/updateAdminFields', {
            method: 'POST',
            adminToken: config.api_token || undefined,
            body: {
              id: serverId,
              adminField01: instance.location_id || '',
              adminField02: userId === 'none' ? '' : userId
            }
          });
        } catch (e) {
          console.warn('Falha ao atualizar Admin Fields no servidor dashboard:', e);
        }
      }

      // 3. Update Supabase
      const { error } = await supabase
        .from('instances')
        .update({ ghl_user_id: userId === 'none' ? null : userId })
        .eq('id', instance.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Usuário vinculado.' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Erro', description: `Falha ao vincular: ${error.message}`, variant: 'destructive' });
    } finally {
      setUpdatingInstanceId(null);
    }
  };

  const handleCopyLink = () => {
    const dashboardUrl = `${window.location.origin}/${locationId}/dashboard?iframe=true`;
    navigator.clipboard.writeText(dashboardUrl);
    toast({
      title: "Link Copiado!",
      description: "O link para o IFRAME foi copiado para sua área de transferência.",
    });
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Monitoramento</h1>
          <p className="text-muted-foreground">Status em tempo real das conexões WhatsApp</p>
        </div>
        {!isIframe && (
          <Button
            onClick={handleCopyLink}
            className="rounded-xl shadow-lg hover:shadow-primary/20 bg-indigo-600 hover:bg-indigo-700 h-11"
          >
            <Zap className="mr-2 h-4 w-4" />
            Copiar Link p/ GHL (Iframe)
          </Button>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instances.map((instance) => {
          const isConnected = instance.status === 'connected';

          return (
            <Card
              key={instance.id}
              className={`overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl rounded-2xl ${isConnected ? 'border-green-100' : 'border-slate-100 shadow-sm'}`}
              onClick={() => !isConnected && setSelectedInstance(instance)}
            >
              <CardContent className="p-0">
                <div className={`p-6 border-b ${isConnected ? 'bg-green-50/30' : 'bg-muted/30'}`}>
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm truncate leading-tight text-slate-900 dark:text-slate-100">
                        {instance.instance_name}
                      </h3>
                      {isConnected && (
                        <div className="mt-1">
                          <Select
                            value={instance.ghl_user_id || 'none'}
                            onValueChange={(val) => handleUserLink(instance, val)}
                            disabled={updatingInstanceId === instance.id || isLoadingUsers}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-full bg-white/50 border-slate-200">
                              <SelectValue placeholder="Vincular Usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum usuário</SelectItem>
                              {ghlUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-[11px]">
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!isConnected && (
                        <p className="text-[10px] text-muted-foreground truncate font-mono opacity-70 mt-1">
                          {instance.instance_token}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <StatusBadge status={instance.status} className="whitespace-nowrap shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="p-8 flex flex-col items-center justify-center min-h-[260px] text-center">
                  {isConnected ? (
                    <div className="text-center space-y-6 w-full">
                      <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center ring-8 ring-green-50 dark:ring-green-900/10">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <div>
                        <p className="font-black text-green-600 tracking-wider">CONECTADO</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Dispositivo pareado e ativo</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full rounded-xl font-bold text-[10px] h-9"
                        disabled={isDisconnecting}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (config?.api_base_url) {
                            handleLogout(instance, config.api_base_url, () => refetch());
                          }
                        }}
                      >
                        {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Unplug className="w-3 h-3 mr-2" />}
                        DESCONECTAR WHATSAPP
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 w-full flex flex-col items-center">
                      <div className="mx-auto w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-200">
                        <QrCode className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Clique para ver QR</p>
                      </div>
                      <div>
                        <p className="font-black text-slate-500 tracking-wider uppercase">OFFLINE</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Clique para gerar QR Code</p>
                      </div>
                    </div>
                  )}
                </div>

                {!isConnected && (
                  <div className="px-5 py-3 bg-primary/5 border-t text-center">
                    <p className="text-[10px] font-bold text-primary flex items-center justify-center gap-1">
                      <Info className="h-3 w-3" /> TOQUE PARA ABRIR DIÁLOGO
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {instances.length === 0 && (
          <div className="col-span-full py-32 text-center border-4 border-dashed rounded-[2rem] bg-muted/10 opacity-60">
            <Smartphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma instância cadastrada.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Contate seu administrador para adicionar conexões.</p>
          </div>
        )}
      </div>

      {
        selectedInstance && (
          <ConnectDialog
            open={!!selectedInstance}
            onOpenChange={(open) => !open && setSelectedInstance(null)}
            instance={selectedInstance}
            onSuccess={() => {
              setSelectedInstance(null);
              refetch();
            }}
          />
        )
      }
    </div >
  );
}