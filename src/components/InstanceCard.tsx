import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { EditInstanceDialog } from '@/components/EditInstanceDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Settings2, Loader2, QrCode, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { uazapiFetch } from '@/lib/uazapi';
import { useInstanceActions } from '@/hooks/use-instance-actions';
import type { Instance, InstanceStatus } from '@/types/instance';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveStatus, setLiveStatus] = useState<InstanceStatus>(instance.status);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);
  const { handleLogout, fetchQrCode, isDisconnecting, isFetchingQr } = useInstanceActions(instance.location_id);

  const checkRealStatus = useCallback(async (silent = false) => {
    if (!config?.api_base_url || !instance.instance_token) return;

    if (!silent) setIsSyncing(true);
    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/status', {
        instanceToken: instance.instance_token
      });

      const apiStatus = data.instance?.status === 'connected' ? 'connected' : 'disconnected';

      if (apiStatus !== liveStatus) {
        setLiveStatus(apiStatus);
        await supabase
          .from('instances')
          .update({ status: apiStatus })
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
  }, [config, instance.instance_token, instance.id, liveStatus, toast]);

  const loadQrCode = useCallback(async () => {
    if (!config?.api_base_url || liveStatus !== 'disconnected') return;
    const qr = await fetchQrCode(instance, config.api_base_url);
    if (qr) setQrCode(qr);
  }, [config, liveStatus, instance, fetchQrCode]);

  useEffect(() => {
    checkRealStatus(true);
  }, []);

  useEffect(() => {
    if (liveStatus === 'disconnected') {
      loadQrCode();
    } else {
      setQrCode(null);
    }
  }, [liveStatus, loadQrCode]);

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
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-600">Conectado</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sincronizado com API real</p>
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
              {qrCode ? (
                <div className="relative group/qr">
                  <img src={qrCode} alt="QR Code" className="w-32 h-32 object-contain rounded-lg border p-1 bg-white shadow-sm" />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover/qr:opacity-100 transition-opacity"
                    onClick={loadQrCode}
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingQr ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              ) : (
                <div className="mx-auto w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 border border-dashed border-slate-200">
                  {isFetchingQr ? <Loader2 className="w-6 h-6 animate-spin text-primary/40" /> : <QrCode className="w-6 h-6 text-slate-400" />}
                </div>
              )}
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">
                {qrCode ? 'ESCANEIE PARA CONECTAR' : 'Desconectado'}
              </p>
              {!qrCode && !isFetchingQr && (
                <Button variant="link" className="text-[10px] h-auto p-0 text-muted-foreground mt-1" onClick={loadQrCode}>
                  Gerar QR Code agora
                </Button>
              )}
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