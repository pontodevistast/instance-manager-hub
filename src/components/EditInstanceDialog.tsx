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
import { Loader2, Trash2, AlertTriangle, Save, Link2Off } from 'lucide-react';
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
  const [confirmType, setConfirmType] = useState<'none' | 'unlink' | 'delete'>('none');
  
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);

  const handleUpdate = async () => {
    if (!name.trim() || !config?.api_base_url) return;
    setIsLoading(true);
    try {
      if (name !== instance.instance_name) {
        await uazapiFetch(config.api_base_url, '/instance/updateInstanceName', {
          method: 'POST',
          instanceToken: instance.instance_token || undefined,
          body: { name: name.trim() }
        });
      }
      await uazapiFetch(config.api_base_url, '/instance/updateAdminFields', {
        method: 'POST',
        adminToken: config.api_token || undefined,
        body: {
          id: instance.instance_token,
          adminField01: adminField01.trim(),
          adminField02: adminField02.trim()
        }
      });
      const { error } = await supabase.from('instances').update({ instance_name: name }).eq('id', instance.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Instância atualizada.' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const processRemoval = async (permanent: boolean) => {
    setIsLoading(true);
    try {
      if (permanent && config?.api_base_url && instance.instance_token) {
        try {
          await uazapiFetch(config.api_base_url, '/instance', {
            method: 'DELETE',
            instanceToken: instance.instance_token
          });
        } catch (e) {
          console.warn('Erro ao deletar no servidor (instância pode não existir):', e);
        }
      }

      const { error } = await supabase.from('instances').delete().eq('id', instance.id);
      if (error) throw error;

      toast({ 
        title: permanent ? 'Excluída permanentemente' : 'Desvinculada do painel',
        description: permanent ? 'A instância foi removida do servidor e do painel.' : 'A instância continua no servidor, mas saiu deste painel.'
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setConfirmType('none');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setConfirmType('none'); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Instância</DialogTitle>
          <DialogDescription>Ajuste dados ou remova a conexão.</DialogDescription>
        </DialogHeader>

        {confirmType === 'none' ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Admin Field 01</Label>
                <Input value={adminField01} onChange={(e) => setAdminField01(e.target.value)} className="h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Admin Field 02</Label>
                <Input value={adminField02} onChange={(e) => setAdminField02(e.target.value)} className="h-8 text-xs font-mono" />
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 text-xs" 
                  onClick={() => setConfirmType('unlink')}
                >
                  <Link2Off className="h-3.5 w-3.5 mr-2" /> Desvincular
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 text-xs text-destructive hover:bg-destructive/10" 
                  onClick={() => setConfirmType('delete')}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Servidor
                </Button>
              </div>
              <Button className="w-full" onClick={handleUpdate} disabled={isLoading || !name.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar Alterações
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className={cn(
              "p-4 rounded-xl border flex gap-3",
              confirmType === 'delete' ? "bg-red-50 border-red-200 text-red-700" : "bg-orange-50 border-orange-200 text-orange-700"
            )}>
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">
                  {confirmType === 'delete' ? 'EXCLUSÃO DEFINITIVA' : 'DESVINCULAR DO PAINEL'}
                </p>
                <p className="mt-1 opacity-90 leading-relaxed">
                  {confirmType === 'delete' 
                    ? 'Esta ação apagará a instância permanentemente do servidor UaZapi e do painel. Não poderá ser recuperada.' 
                    : 'A instância será removida deste painel, mas continuará existindo no servidor UaZapi. Você poderá importá-la novamente depois.'}
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmType('none')} disabled={isLoading} className="flex-1">
                Cancelar
              </Button>
              <Button 
                variant={confirmType === 'delete' ? 'destructive' : 'default'} 
                onClick={() => processRemoval(confirmType === 'delete')}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {confirmType === 'delete' ? 'Sim, Excluir Tudo' : 'Sim, Desvincular'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { cn } from '@/lib/utils';