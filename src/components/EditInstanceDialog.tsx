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
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { Instance } from '@/types/instance';

interface EditInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

export function EditInstanceDialog({ open, onOpenChange, instance, onSuccess }: EditInstanceDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [token, setToken] = useState(instance.instance_token || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('instances')
        .update({ 
          instance_name: name, 
          instance_token: token.trim() || null 
        })
        .eq('id', instance.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Instância atualizada com sucesso.' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', instance.id);

      if (error) throw error;

      toast({ title: 'Instância excluída', description: 'A instância foi removida permanentemente.' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações da Instância</DialogTitle>
          <DialogDescription>
            Altere o nome ou o identificador técnico desta conexão.
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Instância</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: WhatsApp Vendas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token UaZapi (Opcional)</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Identificador da instância"
              />
            </div>

            <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate} disabled={isLoading || !name.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Ação Crítica</p>
                <p>Isso removerá esta instância do painel. A conexão no WhatsApp será perdida. Confirmar?</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Sim, Excluir Instância
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}