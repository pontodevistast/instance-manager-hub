import { useLocation } from '@/contexts/LocationContext';
import { InstanceCard } from '@/components/InstanceCard';
import { InstanceCardSkeleton } from '@/components/InstanceCardSkeleton';
import { Button } from '@/components/ui/button';
import { AddInstanceDialog } from '@/components/AddInstanceDialog';
import { Plus, RefreshCw, Smartphone, PlusCircle, Zap, Loader2 } from 'lucide-react';
import { useInstances } from '@/hooks/use-instances';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { createGHLMenuLink } from '@/lib/ghl';

export default function InstancesPage() {
  const { locationId } = useLocation();
  const { instances, isLoading, refetch } = useInstances(locationId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGhlLoading, setIsGhlLoading] = useState(false);
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(locationId);

  const handleCreateGHLMenu = async () => {
    if (!locationId || !config?.ghl_token) {
      toast({
        title: "Token GHL ausente",
        description: "Certifique-se de configurar o token do GHL na página de integração primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGhlLoading(true);
    try {
      const dashboardUrl = `${window.location.origin}/${locationId}/dashboard?iframe=true`;

      await createGHLMenuLink(config.ghl_token, {
        title: "Instâncias WhatsApp",
        url: dashboardUrl,
        icon: "smartphone",
        openMode: "iframe"
      });

      toast({
        title: "Sucesso!",
        description: "Menu lateral criado no GHL! Recarregue o painel do GHL para ver a nova opção.",
      });

    } catch (error: any) {
      console.error("Erro ao criar menu GHL:", error);
      toast({
        title: "Erro na integração",
        description: error.message || "Não foi possível criar o menu no GHL automaticamente.",
        variant: "destructive"
      });
    } finally {
      setIsGhlLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Minhas Instâncias
          </h1>
          <p className="text-slate-500 mt-1">Gerencie suas conexões do WhatsApp e status em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCreateGHLMenu}
            disabled={isGhlLoading}
            className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {isGhlLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Conectar no GHL
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className="rounded-xl">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none px-6">
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group bg-slate-50/50 dark:bg-slate-900/20 min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-200 transition-all shadow-sm">
            <PlusCircle className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Adicionar Instância</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[160px]">Defina os dados e inicie a conexão</p>
          </div>
        </button>

        {isLoading ? (
          <>
            <InstanceCardSkeleton />
            <InstanceCardSkeleton />
          </>
        ) : (
          instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onRefresh={refetch} />
          ))
        )}
      </div>

      {locationId && (
        <AddInstanceDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          locationId={locationId}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}