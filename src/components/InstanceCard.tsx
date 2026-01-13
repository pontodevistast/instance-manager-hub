import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { EditInstanceDialog } from '@/components/EditInstanceDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Copy, Settings2, Loader2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Instance } from '@/types/instance';
import { cn } from '@/lib/utils';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!instance.instance_token) return;
    
    setIsDisconnecting(true);
    try {
      const response = await fetch('https://dev.bslabs.space/webhook/desconectar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: instance.instance_token }),
      });

      if (!response.ok) throw new Error('Erro ao desconectar no servidor.');

      await supabase
        .from('instances')
        .update({ status: 'disconnected', qr_code: null })
        .eq('id', instance.id);

      toast({ title: 'Desconectado', description: 'WhatsApp desvinculado com sucesso.' });
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Erro ao sair', description: error.message, variant: 'destructive' });
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
              <StatusBadge status={instance.status} />
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
          {instance.status === 'connected' ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-600">Conectado</p>
              <p className="text-[11px] text-muted-foreground mt-1">Pronto para receber mensagens</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 border border-dashed border-slate-200">
                <QrCode className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Desconectado</p>
              <p className="text-[11px] text-muted-foreground mt-1">Escaneie o QR Code para ativar</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex w-full gap-2">
            {instance.status === 'connected' ? (
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
                  onClick={() => onRefresh()}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> STATUS
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

      <ConnectDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} instance={instance} onSuccess={onRefresh} />
      <EditInstanceDialog open={isEditOpen} onOpenChange={setIsEditOpen} instance={instance} onSuccess={onRefresh} />
    </>
  );
}