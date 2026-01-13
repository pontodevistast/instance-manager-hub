import { useState, useEffect } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { InstanceCard } from '@/components/InstanceCard';
import { InstanceCardSkeleton } from '@/components/InstanceCardSkeleton';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import type { Instance } from '@/types/instance';

// Mock data for prototype (replace with Supabase query)
const mockInstances: Instance[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    created_at: new Date().toISOString(),
    location_id: 'loc_demo',
    instance_name: 'Sales Team',
    instance_token: null,
    status: 'connected',
    qr_code: null,
    last_heartbeat: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    created_at: new Date().toISOString(),
    location_id: 'loc_demo',
    instance_name: 'Support Team',
    instance_token: null,
    status: 'disconnected',
    qr_code: null,
    last_heartbeat: null,
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    created_at: new Date().toISOString(),
    location_id: 'loc_demo',
    instance_name: 'Marketing',
    instance_token: null,
    status: 'error',
    qr_code: null,
    last_heartbeat: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function InstancesPage() {
  const { locationId } = useLocation();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstances = async () => {
    setIsLoading(true);
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Filter mock data by location_id
    const filtered = mockInstances.filter(
      (inst) => inst.location_id === locationId || locationId === 'loc_demo'
    );
    setInstances(filtered);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInstances();
  }, [locationId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instances</h1>
          <p className="text-muted-foreground">Manage your WhatsApp instances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchInstances}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Instance
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
            <InstanceCard key={instance.id} instance={instance} onRefresh={fetchInstances} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No instances found for this location.</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create your first instance
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
