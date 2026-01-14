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
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';

interface ManageSubaccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  currentName: string;
  onSuccess: () => void;
}

export function ManageSubaccountDialog({ open, onOpenChange, locationId, currentName, onSuccess }: ManageSubaccountDialogProps) {
  const [newName, setNewName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!newName.trim() || newName === currentName) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ghl_uazapi_config')
        .update({ account_name: newName.trim() })
        .eq('location_id', locationId);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Nome da conta atualizado com sucesso.' });
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
      // Deleta dados de ambas as tabelas
      const deleteConfig = supabase.from('ghl_uazapi_config').delete().eq('location_id', locationId);
      const deleteInstances = supabase.from('instances').delete().eq('location_id', locationId);

      const [resConfig, resInstances] = await Promise.all([deleteConfig, deleteInstances]);

      if (resConfig.error) throw resConfig.error;
      if (resInstances.error) throw resInstances.error;

      toast({ title: 'Subconta excluída', description: 'Todos os dados foram removidos permanentemente.' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Subconta</DialogTitle>
          <DialogDescription>
            Edite o identificador ou remova esta subconta do sistema.
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Location ID</Label>
              <Input
                value={locationId}
                disabled
                className="bg-muted font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accName">Nome da Conta</Label>
              <Input
                id="accName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Unidade Centro"
              />
            </div>

            <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2">
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
                <Button onClick={handleUpdate} disabled={isLoading || newName === currentName}>
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
                <p className="font-bold">Ação Irreversível</p>
                <p>Isso apagará todas as instâncias e configurações desta subconta. Você tem certeza?</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isLoading}>
                Não, Voltar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Sim, Excluir Tudo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}