import { useLocation } from '@/contexts/LocationContext';
import { useInstances } from '@/hooks/use-instances';
import { StatusBadge } from '@/components/StatusBadge';
import { Smartphone, CheckCircle2, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function InstanceDashboard() {
  const { locationId } = useLocation();
  const { instances, isLoading } = useInstances(locationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 min-h-screen bg-background space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Monitoramento</h1>
        <p className="text-muted-foreground">Status em tempo real das conexões WhatsApp</p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instances.map((instance) => (
          <Card key={instance.id} className="overflow-hidden border-2 transition-all hover:shadow-lg">
            <CardContent className="p-0">
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg truncate max-w-[150px]">
                      {instance.instance_name}
                    </h3>
                  </div>
                  <StatusBadge status={instance.status} />
                </div>
              </div>
              
              <div className="p-8 flex flex-col items-center justify-center min-h-[180px]">
                {instance.status === 'connected' ? (
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-green-600">ATIVO</p>
                      <p className="text-xs text-muted-foreground mt-1">Conexão estável</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3 grayscale opacity-60">
                    <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300">
                      <QrCode className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-500">OFFLINE</p>
                      <p className="text-xs text-muted-foreground mt-1">Aguardando conexão</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {instances.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
            <p className="text-muted-foreground">Nenhuma instância cadastrada nesta subconta.</p>
          </div>
        )}
      </div>
    </div>
  );
}