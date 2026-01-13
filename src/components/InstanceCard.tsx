import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { EditInstanceDialog } from '@/components/EditInstanceDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Copy, Send, Settings2, Loader2 } from 'lucide-react';
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

  const copyToken = () => {
    if (instance.instance_token) {
      navigator.clipboard.writeText(instance.instance_token);
      toast({ title: 'Copiado' });
    }
  };

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

      // Atualiza o status no banco de dados local
      await supabase
        .from('instances')
        .update({ status: 'disconnected', qr_code: null })
        .eq('id', instance.id);

      toast({ title: 'Desconectado', description: 'A instância foi desconectada com sucesso.' });
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Erro ao sair', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-slate-950">
        <CardHeader className="p-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[120px]">
                  {instance.instance_name || 'Instância'}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {instance.instance_token ? `${instance.instance_token.substring(0, 8)}...` : 'Sem Token'}
                  </span>
                  {instance.instance_token && (
                    <button onClick={copyToken} className="text-slate-400 hover:text-indigo-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={instance.status} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditOpen(true)}
              >
                <Settings2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-4 flex-1">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px] border border-dashed border-slate-200 dark:border-slate-800">
            {instance.status === 'connected' ? (
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">WhatsApp Conectado</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-[11px] text-slate-500">Requer conexão ativa</p>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setIsConnectOpen(true)}>
                  Conectar agora
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 gap-2 border-t border-slate-50 dark:border-slate-900 mt-2 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex w-full gap-2 pt-4">
            {instance.status === 'connected' ? (
              <>
                <Button variant="ghost" className="flex-1 h-8 text-[10px] font-bold" disabled>
                  <Send className="w-3 h-3 mr-2" /> TESTAR
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-8 text-[10px] font-bold text-red-600 border-red-100"
                  onClick={handleLogout}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Unplug className="w-3 h-3 mr-2" />}
                  SAIR
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="flex-1 h-8 text-[10px] font-bold" onClick={() => onRefresh()}>
                  <RefreshCw className="w-3 h-3 mr-2" /> STATUS
                </Button>
                <Button className="flex-1 h-8 text-[10px] font-bold" onClick={() => setIsConnectOpen(true)}>
                  CONECTAR
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