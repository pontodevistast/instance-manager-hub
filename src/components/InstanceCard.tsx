import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { Smartphone, Unplug, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from '@/types/instance';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

const WEBHOOK_URL = 'https://n8n.webhook.url/action';

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          instance_id: instance.id,
          location_id: instance.location_id,
        }),
      });

      toast({
        title: 'Solicitação de desconexão enviada',
        description: 'A instância será desconectada em breve.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar solicitação.',
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
                src={instance.qr_code} 
                alt="WhatsApp QR Code" 
                className="w-48 h-48 object-contain"
              />
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={onRefresh}>
                <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
              </Button>
            </div>
          ) : null}

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="truncate">
              <span className="font-medium text-foreground">ID:</span> {instance.id.slice(0, 8)}...
            </p>
            {instance.last_heartbeat && (
              <p>
                <span className="font-medium text-foreground">Visto por último:</span>{' '}
                {new Date(instance.last_heartbeat).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t bg-muted/20">
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
            <Button className="w-full" onClick={() => setIsConnectOpen(true)} disabled={isLoading}>
              <Smartphone className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
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