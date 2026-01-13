import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Copy, Send, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from '@/types/instance';
import { cn } from '@/lib/utils';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const maskToken = (token: string | null) => {
    if (!token) return 'Sem Token';
    if (token.length < 8) return token;
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  };

  const copyToken = () => {
    if (instance.instance_token) {
      navigator.clipboard.writeText(instance.instance_token);
      toast({ title: 'Copiado', description: 'Token da instância copiado para a área de transferência.' });
    }
  };

  const handleTestMessage = async () => {
    toast({ title: 'Teste enviado', description: 'Uma mensagem de teste foi solicitada para esta instância.' });
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
                <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-none">
                  {instance.instance_name || 'Instância WhatsApp'}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    {maskToken(instance.instance_token)}
                  </span>
                  {instance.instance_token && (
                    <button onClick={copyToken} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <StatusBadge status={instance.status} />
          </div>
        </CardHeader>

        <CardContent className="px-5 py-4 flex-1">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px] border border-dashed border-slate-200 dark:border-slate-800">
            {instance.status === 'connected' ? (
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Pronto para uso</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-xs text-slate-500 max-w-[150px]">Requer conexão para processar mensagens</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs font-semibold"
                  onClick={() => setIsConnectOpen(true)}
                >
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
                <Button variant="ghost" className="flex-1 h-9 text-[11px] font-bold" onClick={handleTestMessage}>
                  <Send className="w-3.5 h-3.5 mr-2" />
                  TESTAR
                </Button>
                <Button variant="outline" className="flex-1 h-9 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 hover:border-red-200">
                  <Unplug className="w-3.5 h-3.5 mr-2" />
                  SAIR
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="flex-1 h-9 text-[11px] font-bold" onClick={() => onRefresh()}>
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} />
                  STATUS
                </Button>
                <Button className="flex-1 h-9 text-[11px] font-bold shadow-md shadow-indigo-200 dark:shadow-none" onClick={() => setIsConnectOpen(true)}>
                  CONFIGURAR
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      <ConnectDialog
        open={isConnectOpen}
        onOpenChange={setIsConnectOpen}
        instance={instance}
        onSuccess={onRefresh}
      />
    </>
  );
}