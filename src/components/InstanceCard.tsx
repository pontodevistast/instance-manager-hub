import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from '@/types/instance';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

const WEBHOOK_DISCONNECT_URL = 'https://dev.bslabs.space/webhook/desconectar';
const WEBHOOK_STATUS_URL = 'https://dev.bslabs.space/webhook/status';

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    if (!instance.instance_token) {
      toast({ title: 'Aviso', description: 'Token da instância não configurado.' });
      return;
    }

    setIsLoading(true);
    try {
      await fetch(WEBHOOK_DISCONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instance.instance_token,
        }),
      });

      toast({
        title: 'Solicitação enviada',
        description: 'A instância será desconectada em breve.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar solicitação de desconexão.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!instance.instance_token) return;
    
    setIsLoading(true);
    try {
      await fetch(WEBHOOK_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instance.instance_token,
        }),
      });
      
      toast({
        title: 'Status atualizado',
        description: 'Verificando conexão com o servidor...',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao verificar status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold leading-tight">
                {instance.instance_name || 'Instância sem nome'}
              </CardTitle>
            </div>
            <StatusBadge status={instance.status} />
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          {instance.status === 'disconnected' && instance.qr_code ? (
            <div className="mb-4 flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-dashed border-gray-200">
              <p className="text-xs font-medium text-muted-foreground mb-2">Escaneie o QR Code</p>
              <img 
                src={instance.qr_code.startsWith('data:') ? instance.qr_code : `data:image/png;base64,${instance.qr_code}`} 
                alt="WhatsApp QR Code" 
                className="w-48 h-48 object-contain"
              />
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={handleCheckStatus}>
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar Status
              </Button>
            </div>
          ) : instance.status === 'connected' ? (
            <div className="mb-4 flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                WhatsApp Conectado
              </p>
            </div>
          ) : null}

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="truncate">
              <span className="font-medium text-foreground">Token:</span> {instance.instance_token || 'Não configurado'}
            </p>
            {instance.last_heartbeat && (
              <p>
                <span className="font-medium text-foreground">Último Status:</span>{' '}
                {new Date(instance.last_heartbeat).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t bg-muted/20 gap-2">
          {instance.status === 'connected' ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              <Unplug className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsConnectOpen(true)}
                disabled={isLoading}
              >
                Configurar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCheckStatus}
                disabled={isLoading || !instance.instance_token}
              >
                Conectar
              </Button>
            </div>
          )}
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