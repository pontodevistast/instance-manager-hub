import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { Smartphone, Unplug, RefreshCw, CheckCircle2, Settings2 } from 'lucide-react';
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
    if (!instance.instance_token) return;

    setIsLoading(true);
    try {
      await fetch(WEBHOOK_DISCONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: instance.instance_token }),
      });

      toast({ title: 'Sucesso', description: 'Solicitação de desconexão enviada.' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao desconectar.', variant: 'destructive' });
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
        body: JSON.stringify({ instanceName: instance.instance_token }),
      });
      
      toast({ title: 'Verificando...', description: 'Atualizando status da conexão.' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao verificar status.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatQrCode = (qr: string) => {
    if (!qr) return null;
    if (qr.startsWith('data:')) return qr;
    if (qr.startsWith('http')) return qr;
    return `data:image/png;base64,${qr}`;
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold leading-tight">
                  {instance.instance_name || 'Nova Instância'}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  ID: {instance.instance_token || 'N/A'}
                </p>
              </div>
            </div>
            <StatusBadge status={instance.status} />
          </div>
        </CardHeader>

        <CardContent className="flex-1 py-6">
          {instance.status === 'disconnected' && instance.qr_code ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 bg-white rounded-xl border-2 border-primary/20 shadow-inner">
                <img 
                  src={formatQrCode(instance.qr_code)!} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground animate-pulse">
                Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos Conectados
              </p>
            </div>
          ) : instance.status === 'connected' ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-green-700">Dispositivo Conectado</p>
                <p className="text-xs text-muted-foreground mt-1">Pronto para processar mensagens</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <Settings2 className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Clique em "Configurar" para <br/> gerar o QR Code</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t bg-muted/20 gap-2 p-4">
          <div className="flex w-full gap-2">
            <Button 
              variant="outline" 
              className="flex-1 h-9 text-xs" 
              onClick={() => setIsConnectOpen(true)}
              disabled={isLoading}
            >
              Configurar
            </Button>
            
            {instance.status === 'connected' ? (
              <Button
                variant="destructive"
                className="flex-1 h-9 text-xs"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                <Unplug className="w-3.5 h-3.5 mr-1.5" />
                Desconectar
              </Button>
            ) : (
              <Button 
                className="flex-1 h-9 text-xs" 
                onClick={handleCheckStatus}
                disabled={isLoading || !instance.instance_token}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Status
              </Button>
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