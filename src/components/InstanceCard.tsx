import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectDialog } from '@/components/ConnectDialog';
import { Smartphone, Unplug } from 'lucide-react';
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
        title: 'Disconnect request sent',
        description: `Instance "${instance.instance_name}" will be disconnected.`,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send disconnect request.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold leading-tight">
                {instance.instance_name || 'Unnamed Instance'}
              </CardTitle>
            </div>
            <StatusBadge status={instance.status} />
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="truncate">
              <span className="font-medium">ID:</span> {instance.id.slice(0, 8)}...
            </p>
            {instance.last_heartbeat && (
              <p>
                <span className="font-medium">Last seen:</span>{' '}
                {new Date(instance.last_heartbeat).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t">
          {instance.status === 'connected' ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              <Unplug className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setIsConnectOpen(true)}>
              <Smartphone className="w-4 h-4 mr-2" />
              Connect Instance
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
