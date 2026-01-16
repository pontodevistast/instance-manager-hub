import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { EditInstanceDialog } from '@/components/EditInstanceDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Settings2, Loader2, QrCode, AlertCircle, User, Briefcase, Apple } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { uazapiFetch } from '@/lib/uazapi';
import { useInstanceActions } from '@/hooks/use-instance-actions';
import type { Instance, InstanceStatus } from '@/types/instance';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
  ghlUsers?: any[];
}

export function InstanceCard({ instance, onRefresh, ghlUsers = [] }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveStatus, setLiveStatus] = useState<InstanceStatus>(instance.status);
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);
  const { handleLogout, isDisconnecting } = useInstanceActions(instance.location_id);

  const checkRealStatus = useCallback(async (silent = false) => {
    if (!config?.api_base_url || !instance.instance_token) return;

    if (!silent) setIsSyncing(true);
    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/status', {
        instanceToken: instance.instance_token
      });

      const apiStatus = data.instance?.status === 'connected' ? 'connected' : 'disconnected';
      const meta = data.instance || {};

      // Extração robusta do número (owner/jid)
      let rawOwner = meta.owner || meta.jid || meta.id;
      if (rawOwner && typeof rawOwner === 'string') {
        rawOwner = rawOwner.replace(/@.*$/, '').replace(/[^0-9]/g, '');
      }

      const platformVal = meta.platform || meta.plataform;

      // Atualiza no banco se houver mudanças relevantes
      if (apiStatus !== liveStatus || meta.profileName !== instance.profile_name || rawOwner !== instance.owner) {
        setLiveStatus(apiStatus);

        await supabase
          .from('instances')
          .update({
            status: apiStatus,
            owner: rawOwner,
            profile_name: meta.profileName,
            profile_pic_url: meta.profilePicUrl,
            is_business: meta.isBusiness,
            platform: platformVal
          })
          .eq('id', instance.id);
      }

      if (!silent) toast({ title: 'Status Atualizado', description: `A instância está ${apiStatus}.` });
    } catch (error: any) {
      console.error('Erro ao checar status:', error);
      if (!silent) {
        setLiveStatus('error');
        toast({ title: 'Erro de Sincronização', description: error.message, variant: 'destructive' });
      }
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [config, instance.instance_token, instance.id, instance.profile_name, instance.owner, liveStatus, toast]);

  useEffect(() => {
    checkRealStatus(true);
  }, []);

  const onLogout = async () => {
    if (!config?.api_base_url) return;
    await handleLogout(instance, config.api_base_url, () => {
      setLiveStatus('disconnected');
      onRefresh();
    });
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 transition-all duration-300 hover:shadow-xl bg-white dark:bg-slate-950 min-h-[320px] rounded-2xl">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-start justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/5 dark:bg-primary/10 rounded-xl flex items-center justify-center border border-primary/10 shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {instance.instance_name}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono uppercase truncate opacity-70">
                  {instance.instance_token}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusBadge status={liveStatus} className="whitespace-nowrap shadow-sm" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-slate-100"
                onClick={() => setIsEditOpen(true)}
              >
                <Settings2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-4 flex-1 flex flex-col items-center justify-center min-h-[200px]">
          {liveStatus === 'connected' ? (
            <div className="flex flex-col items-center justify-center w-full space-y-3 animate-in fade-in zoom-in duration-300">
              <div className="relative group/avatar cursor-pointer">
                <img
                  src={instance.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(instance.profile_name || instance.instance_name)}&background=random`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 object-cover shadow-sm group-hover/avatar:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-slate-950 rounded-full shadow-sm" title="Online" />
              </div>

              <div className="text-center space-y-0.5">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight px-2 line-clamp-1" title={instance.profile_name || ''}>
                  {instance.profile_name || instance.instance_name}
                </h4>
                <p className="text-sm font-mono text-muted-foreground bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md inline-block">
                  {instance.owner ? `+${instance.owner}` : "Sem número"}
                </p>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2 mt-1">
                {instance.is_business && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                    <Briefcase className="w-3 h-3" /> Business
                  </Badge>
                )}
                {instance.platform && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 capitalize">
                    {instance.platform.toLowerCase().includes('ios') ? <Apple className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                    {instance.platform}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 text-green-600 border-green-200 bg-green-50">
                  <CheckCircle2 className="w-3 h-3" /> Ativo
                </Badge>
              </div>
            </div>
          ) : liveStatus === 'error' ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-3 border border-red-200">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600">Erro na Sessão</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sessão travada ou inválida</p>
            </div>
          ) : (
            <div className="text-center w-full flex flex-col items-center">
              <div
                className="mx-auto w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group/placeholder"
                onClick={() => setIsConnectOpen(true)}
              >
                <QrCode className="w-8 h-8 text-slate-300 group-hover/placeholder:text-primary transition-colors mb-2" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Clique para Conectar</p>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-3 uppercase tracking-wider font-black">
                Desconectado
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-[10px] h-9"
                onClick={() => setIsConnectOpen(true)}
              >
                GERAR QR CODE
              </Button>
            </div>
          )}

          {instance.ghl_user_id && (
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <User className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                {ghlUsers.find(u => u.id === instance.ghl_user_id)?.name || 'Usuário Vinculado'}
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 w-full gap-2">
            {liveStatus !== 'disconnected' ? (
              <Button
                variant="destructive"
                className="w-full h-10 text-xs font-bold rounded-xl"
                onClick={onLogout}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Unplug className="w-3.5 h-3.5 mr-2" />}
                ENCERRAR SESSÃO
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  variant="outline"
                  className="h-10 text-xs font-bold rounded-xl"
                  onClick={() => checkRealStatus()}
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />} STATUS
                </Button>
                <Button
                  className="h-10 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setIsConnectOpen(true)}
                >
                  <QrCode className="w-3.5 h-3.5 mr-2" /> CONECTAR
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      </Card >

      <ConnectDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} instance={instance} onSuccess={() => { checkRealStatus(true); onRefresh(); }} />
      <EditInstanceDialog open={isEditOpen} onOpenChange={setIsEditOpen} instance={instance} onSuccess={onRefresh} />
    </>
  );
}