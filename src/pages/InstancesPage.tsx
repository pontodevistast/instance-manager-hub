import { useLocation } from '@/contexts/LocationContext';
import { InstanceCard } from '@/components/InstanceCard';
import { InstanceCardSkeleton } from '@/components/InstanceCardSkeleton';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Smartphone } from 'lucide-react';
import { useInstances } from '@/hooks/use-instances';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function InstancesPage() {
  const { locationId } = useLocation();
  const { instances, isLoading, refetch } = useInstances(locationId);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleAddInstance = async () => {
    if (!locationId) return;
    
    setIsCreating(true);
    try {
      const { error } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: 'Nova Instância',
        status: 'disconnected',
      });

      if (error) throw error;
      
      toast({
        title: 'Instância criada',
        description: 'Agora você pode configurá-la para conectar.',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
          <p className="text-muted-foreground">Gerencie suas conexões do WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleAddInstance} disabled={isCreating || !locationId}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Instância
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <InstanceCardSkeleton />
            <InstanceCardSkeleton />
            <InstanceCardSkeleton />
          </>
        ) : instances.length > 0 ? (
          instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onRefresh={refetch} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-background rounded-xl border border-dashed border-gray-300">
            <Smartphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma instância encontrada</h3>
            <p className="text-muted-foreground mb-6">Crie sua primeira instância para começar a usar.</p>
            <Button onClick={handleAddInstance} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira instância
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}