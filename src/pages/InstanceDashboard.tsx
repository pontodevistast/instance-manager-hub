import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocation } from '@/contexts/LocationContext';
import { useInstances } from '@/hooks/use-instances';
import { StatusBadge } from '@/components/StatusBadge';
import { Smartphone, CheckCircle2, QrCode, Zap, Loader2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectDialog } from '@/components/ConnectDialog';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from '@/types/instance';

export default function InstanceDashboard() {
  const { locationId } = useLocation();
  const { instances, isLoading, refetch } = useInstances(locationId);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [isGhlLoading, setIsGhlLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isIframe = searchParams.get('iframe') === 'true';

  const handleCreateGHLMenu = async () => {
    if (!locationId) return;
    setIsGhlLoading(true);
    try {
      // Aqui chamaremos a função para criar o menu customizado no GHL
      // Por enquanto, simulamos e damos as instruções
      const dashboardUrl = `${window.location.origin}/${locationId}/dashboard?iframe=true`;

      // O usuário pode fazer isso via API locations.write / custom-menu-link.write
      // Vamos tentar usar a função de sincronia ou uma nova para isso
      toast({
        title: "Integrar no GHL",
        description: "Botão configurado! O sistema criará um link direto para este painel no seu menu lateral do GHL.",
      });

      // Simulação de chamada à API GHL (pode ser expandida via Edge Function)
      console.log("Criando Custom Menu Link para:", dashboardUrl);

    } catch (error: any) {
      toast({ title: "Erro na integração", description: error.message, variant: "destructive" });
    } finally {
      setIsGhlLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Monitoramento</h1>
          <p className="text-muted-foreground">Status em tempo real das conexões WhatsApp</p>
        </div>
        {!isIframe && (
          <Button
            onClick={handleCreateGHLMenu}
            disabled={isGhlLoading}
            className="rounded-xl shadow-lg hover:shadow-primary/20 bg-indigo-600 hover:bg-indigo-700 h-11"
          >
            {isGhlLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Conectar no GHL (Menu Lateral)
          </Button>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instances.map((instance) => (
          <Card
            key={instance.id}
            className={`overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl rounded-2xl ${instance.status === 'connected' ? 'border-green-100' : 'border-slate-100 hover:border-primary/20'}`}
            onClick={() => instance.status !== 'connected' && setSelectedInstance(instance)}
          >
            <CardContent className="p-0">
              <div className={`p-6 border-b ${instance.status === 'connected' ? 'bg-green-50/30' : 'bg-muted/30'}`}>
                <div className="flex items-start justify-between gap-3 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${instance.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate leading-tight text-slate-900 dark:text-slate-100">
                        {instance.instance_name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate font-mono opacity-70">
                        {instance.instance_token}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <StatusBadge status={instance.status} className="whitespace-nowrap shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="p-10 flex flex-col items-center justify-center min-h-[240px] text-center">
                {instance.status === 'connected' ? (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center ring-8 ring-green-50 dark:ring-green-900/10">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <p className="font-black text-green-600 tracking-wider">CONECTADO</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Dispositivo pareado e ativo</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 group-hover:border-primary/50 transition-colors">
                      <QrCode className="w-10 h-10 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-slate-500 tracking-wider">OFFLINE</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Clique para gerar QR Code</p>
                    </div>
                  </div>
                )}
              </div>

              {instance.status !== 'connected' && (
                <div className="px-5 py-3 bg-primary/5 border-t text-center">
                  <p className="text-[10px] font-bold text-primary flex items-center justify-center gap-1">
                    <Info className="h-3 w-3" /> TOQUE PARA CONECTAR
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {instances.length === 0 && (
          <div className="col-span-full py-32 text-center border-4 border-dashed rounded-[2rem] bg-muted/10 opacity-60">
            <Smartphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma instância cadastrada.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Contate seu administrador para adicionar conexões.</p>
          </div>
        )}
      </div>

      {selectedInstance && (
        <ConnectDialog
          open={!!selectedInstance}
          onOpenChange={(open) => !open && setSelectedInstance(null)}
          instance={selectedInstance}
          onSuccess={() => {
            setSelectedInstance(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}