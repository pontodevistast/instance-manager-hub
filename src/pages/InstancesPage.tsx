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
import { listGHLUsers } from '@/lib/ghl';
import { useEffect } from 'react';

export default function InstancesPage() {
  const { locationId } = useLocation();
  const { instances, isLoading, refetch } = useInstances(locationId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [ghlUsers, setGhlUsers] = useState<any[]>([]);
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(locationId);

  useEffect(() => {
    async function fetchUsers() {
      if (locationId && config?.ghl_token) {
        try {
          const users = await listGHLUsers(config.ghl_token, locationId);
          setGhlUsers(users);
        } catch (err) {
          console.error('Erro ao buscar usuários:', err);
        }
      }
    }
    fetchUsers();
  }, [locationId, config?.ghl_token]);

  const handleCopyLink = () => {
    const dashboardUrl = `${window.location.origin}/${locationId}/dashboard?iframe=true`;
    navigator.clipboard.writeText(dashboardUrl);
    toast({
      title: "Link Copiado!",
      description: "O link para o IFRAME foi copiado para sua área de transferência.",
    });
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
            onClick={handleCopyLink}
            className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Zap className="h-4 w-4 mr-2" />
            Copiar Link p/ GHL
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
            <InstanceCard
              key={instance.id}
              instance={instance}
              onRefresh={refetch}
              ghlUsers={ghlUsers}
            />
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