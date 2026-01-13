import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { EditInstanceDialog } from '@/components/EditInstanceDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Settings2, Loader2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { uazapiFetch } from '@/lib/uazapi';
import type { Instance, InstanceStatus } from '@/types/instance';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [liveStatus, setLiveStatus] = useState<InstanceStatus>(instance.status);
  
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);

  const checkRealStatus = useCallback(async (silent = false) => {
    if (!config?.api_base_url || !instance.instance_token) return;
    
    if (!silent) setIsSyncing(true);
    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/status', {
        instanceToken: instance.instance_token
      });

      // Mapeamento de status baseado na resposta da API
      const apiStatus = data.instance?.status === 'connected' ? 'connected' : 'disconnected';
      
      if (apiStatus !== liveStatus) {
        setLiveStatus(apiStatus);
        // Atualiza o Supabase se o status divergir
        await supabase
          .from('instances')
          .update({ status: apiStatus })
          .eq('id', instance.id);
      }

      if (!silent) toast({ title: 'Status Atualizado', description: `A instância está ${apiStatus}.` });
    } catch (error: any) {
      console.error('Erro ao checar status:', error);
      if (!silent) toast({ title: 'Erro de Sincronização', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [config, instance.instance_token, instance.id, liveStatus, toast]);

  // Checagem automática ao montar
  useEffect(() => {
    checkRealStatus(true);
  }, []);

  const handleLogout = async () => {
    if (!config?.api_base_url || !instance.instance_token) return;
    
    setIsDisconnecting(true);
    try {
      await uazapiFetch(config.api_base_url, '/instance/disconnect', {
        method: 'POST',
        instanceToken: instance.instance_token
      });

      await supabase
        .from('instances')
        .update({ status: 'disconnected', qr_code: null })
        .eq('id', instance.id);

      setLiveStatus('disconnected');
      toast({ title: 'Desconectado', description: 'WhatsApp desvinculado com sucesso.' });
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Erro ao desconectar', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 transition-all duration-300 hover:shadow-xl bg-white dark:bg-slate-950 min-h-[300px]">
        <CardHeader className="p-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/5 dark:bg-primary/10 rounded-xl flex items-center justify-center border border-primary/10">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[140px]">
                  {instance.instance_name}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono uppercase truncate max-w-[140px]">
                  ID: {instance.instance_token}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={liveStatus} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditOpen(true)}
              >
                <Settings2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-4 flex-1 flex flex-col items-center justify-center">
          {liveStatus === 'connected' ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-600">Conectado</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sincronizado com API real</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 border border-dashed border-slate-200">
                <QrCode className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Desconectado</p>
              <p className="text-[11px] text-muted-foreground mt-1">Aguardando vinculação</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex w-full gap-2">
            {liveStatus === 'connected' ? (
              <Button 
                variant="destructive" 
                className="w-full h-9 text-xs font-bold"
                onClick={handleLogout}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Unplug className="w-3.5 h-3.5 mr-2" />}
                DESCONECTAR
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1 h-9 text-xs font-bold" 
                  onClick={() => checkRealStatus()}
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />} STATUS
                </Button>
                <Button 
                  className="flex-1 h-9 text-xs font-bold" 
                  onClick={() => setIsConnectOpen(true)}
                >
                  <QrCode className="w-3.5 h-3.5 mr-2" /> CONECTAR
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      <ConnectDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} instance={instance} onSuccess={() => { checkRealStatus(true); onRefresh(); }} />
      <EditInstanceDialog open={isEditOpen} onOpenChange={setIsEditOpen} instance={instance} onSuccess={onRefresh} />
    </>
  );
}