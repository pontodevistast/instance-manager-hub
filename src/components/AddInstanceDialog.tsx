import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus } from 'lucide-react';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onSuccess: () => void;
}

export function AddInstanceDialog({ open, onOpenChange, locationId, onSuccess }: AddInstanceDialogProps) {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: name.trim(),
        instance_token: token.trim(),
        status: 'disconnected',
      });

      if (error) throw error;

      toast({ title: 'Instância criada', description: 'Agora você pode prosseguir com a conexão.' });
      setName('');
      setToken('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Nova Instância</DialogTitle>
            <DialogDescription>
              Informe os dados da sua nova conexão WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Instância</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Suporte Vendas"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token UaZapi (Chave da Instância)</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Identificador único no servidor"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !token.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Instância
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}