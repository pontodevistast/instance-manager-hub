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
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { uazapiFetch } from '@/lib/uazapi';
import { Loader2, Trash2, AlertTriangle, Save } from 'lucide-react';
import type { Instance } from '@/types/instance';

interface EditInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

export function EditInstanceDialog({ open, onOpenChange, instance, onSuccess }: EditInstanceDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [adminField01, setAdminField01] = useState(instance.location_id || '');
  const [adminField02, setAdminField02] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);

  const handleUpdate = async () => {
    if (!name.trim() || !config?.api_base_url) return;

    setIsLoading(true);
    try {
      // 1. Atualizar Nome via API
      if (name !== instance.instance_name) {
        await uazapiFetch(config.api_base_url, '/instance/updateInstanceName', {
          method: 'POST',
          instanceToken: instance.instance_token || undefined,
          body: { name: name.trim() }
        });
      }

      // 2. Atualizar Campos Administrativos via API
      await uazapiFetch(config.api_base_url, '/instance/updateAdminFields', {
        method: 'POST',
        adminToken: config.api_token || undefined,
        body: {
          id: instance.instance_token,
          adminField01: adminField01.trim(),
          adminField02: adminField02.trim()
        }
      });

      // 3. Atualizar localmente no Supabase
      const { error } = await supabase
        .from('instances')
        .update({ instance_name: name })
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
      // 1. Tenta deletar no Servidor
      if (config?.api_base_url && instance.instance_token) {
        try {
          await uazapiFetch(config.api_base_url, '/instance', {
            method: 'DELETE',
            instanceToken: instance.instance_token
          });
        } catch (serverError) {
          // Se der erro no servidor (instância não existe/fantasma), apenas logamos e continuamos
          console.warn('Servidor retornou erro na exclusão (provável instância fantasma):', serverError);
        }
      }

      // 2. Deletar no Supabase (Sempre executado, mesmo se o servidor falhar)
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', instance.id);

      if (error) throw error;

      toast({ 
        title: 'Instância removida', 
        description: 'O registro foi excluído do painel com sucesso.' 
      });
      
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
          <DialogTitle>Gerenciar Instância</DialogTitle>
          <DialogDescription>Configurações técnicas via API UaZapi.</DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome de Exibição</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: WhatsApp Vendas"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Admin Field 01 (Location)</Label>
                <Input
                  value={adminField01}
                  onChange={(e) => setAdminField01(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Admin Field 02 (Extra)</Label>
                <Input
                  value={adminField02}
                  onChange={(e) => setAdminField02(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="opcional"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleUpdate} disabled={isLoading || !name.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Salvar
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
                <p>Isso removerá a instância permanentemente do seu painel. Confirmar?</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isLoading}>Não</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Sim, Excluir Agora'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}