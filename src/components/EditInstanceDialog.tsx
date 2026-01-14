import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { uazapiFetch } from '@/lib/uazapi';
import { Loader2, Trash2, AlertTriangle, Save, Link2Off, Unplug, Smartphone, User } from 'lucide-react';
import { listGHLUsers } from '@/lib/ghl';
import type { Instance } from '@/types/instance';
import { cn } from '@/lib/utils';

interface EditInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

export function EditInstanceDialog({ open, onOpenChange, instance, onSuccess }: EditInstanceDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [adminField01, setAdminField01] = useState(instance.location_id || '');
  const [ghlUserId, setGhlUserId] = useState(instance.ghl_user_id || 'none');
  const [ghlUsers, setGhlUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [confirmType, setConfirmType] = useState<'none' | 'unlink' | 'delete'>('none');

  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);

  useEffect(() => {
    async function fetchUsers() {
      if (open && config?.ghl_token && instance.location_id) {
        setIsLoadingUsers(true);
        try {
          const users = await listGHLUsers(config.ghl_token, instance.location_id);
          console.log('[EditInstanceDialog] Users fetched:', users);
          setGhlUsers(users);
        } catch (err: any) {
          console.error('Erro ao carregar usuários:', err);
          toast({
            title: 'Erro ao carregar usuários GHL',
            description: err.message,
            variant: 'destructive'
          });
        } finally {
          setIsLoadingUsers(false);
        }
      }
    }
    fetchUsers();
  }, [open, config?.ghl_token, instance.location_id]);

  useEffect(() => {
    if (open) {
      setName(instance.instance_name || '');
      setAdminField01(instance.location_id || '');
      setGhlUserId(instance.ghl_user_id || 'none');
    }
  }, [open, instance]);

  const handleUpdate = async () => {
    if (!name.trim() || !config?.api_base_url) return;
    setIsLoading(true);
    try {
      // 1. Fetch server instance details to get the correct short ID
      const allInstances = await uazapiFetch(config.api_base_url, '/instance/all', {
        adminToken: config.api_token || undefined
      });

      const instanceList = (Array.isArray(allInstances) ? allInstances : (allInstances.instances || [])) as any[];
      console.log('[EditInstanceDialog] Server Instances:', instanceList);

      const remoteInstance = instanceList.find((i: any) => i.token === instance.instance_token);

      if (!remoteInstance?.id) {
        console.error('[EditInstanceDialog] Instance mismatched:', instance.instance_token, 'Available:', instanceList);
        throw new Error('Instância não encontrada no servidor UaZapi (Token mismatch).');
      }

      const serverId = remoteInstance.id;
      console.log('[EditInstanceDialog] Resolved Server ID:', serverId);

      // 2. Update Name (Try Admin Token, fallback to Instance Token)
      if (name !== instance.instance_name) {
        try {
          // Attempt 1: Admin Token
          await uazapiFetch(config.api_base_url, '/instance/updateInstanceName', {
            method: 'POST',
            adminToken: config.api_token || undefined,
            body: { id: serverId, name: name.trim() }
          });
        } catch (nameError) {
          console.warn('Falha ao atualizar nome com Admin Token, tentando Instance Token...', nameError);
          // Attempt 2: Instance Token (User Hypothesis)
          await uazapiFetch(config.api_base_url, '/instance/updateInstanceName', {
            method: 'POST',
            instanceToken: instance.instance_token,
            body: { id: serverId, name: name.trim() }
          }).catch(e => {
            console.error('Falha ao atualizar nome com Instance Token:', e);
            toast({
              title: 'Aviso',
              description: 'Nome não atualizado no servidor UaZapi. Verifique as permissões.',
              variant: 'destructive'
            });
          });
        }
      }

      // 3. Update Admin Fields (Non-blocking)
      try {
        await uazapiFetch(config.api_base_url, '/instance/updateAdminFields', {
          method: 'POST',
          adminToken: config.api_token || undefined,
          body: {
            id: serverId,
            adminField01: adminField01.trim(),
            adminField02: ghlUserId === 'none' ? '' : ghlUserId
          }
        });
      } catch (fieldsError) {
        console.error('Falha ao atualizar Admin Fields:', fieldsError);
        // Don't block flow, user primarily wants to link user locally
      }

      const { error } = await supabase
        .from('instances')
        .update({
          instance_name: name,
          ghl_user_id: ghlUserId === 'none' ? null : ghlUserId
        })
        .eq('id', instance.id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Instância atualizada.' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('[EditInstanceDialog] Update Failed:', error);
      console.error('[EditInstanceDialog] Config used:', {
        baseUrl: config?.api_base_url,
        tokenSuffix: config?.api_token ? config.api_token.slice(-5) : 'NONE'
      });
      toast({ title: 'Erro', description: `Falha ao salvar: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppLogout = async () => {
    if (!config?.api_base_url || !instance.instance_token) return;
    setIsLoggingOut(true);
    try {
      await uazapiFetch(config.api_base_url, '/instance/logout', {
        method: 'POST',
        instanceToken: instance.instance_token
      }).catch(() => {
        return uazapiFetch(config.api_base_url!, '/instance/disconnect', {
          method: 'POST',
          instanceToken: instance.instance_token!
        });
      });

      await supabase.from('instances').update({ status: 'disconnected', qr_code: null }).eq('id', instance.id);
      toast({ title: 'Sessão Encerrada', description: 'WhatsApp liberado para nova conexão.' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao deslogar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoggingOut(false);
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
          console.warn('Erro ao deletar no servidor:', e);
        }
      }

      const { error } = await supabase.from('instances').delete().eq('id', instance.id);
      if (error) throw error;

      toast({
        title: permanent ? 'Excluída permanentemente' : 'Desvinculada do painel',
        description: permanent ? 'A instância foi removida do servidor e do painel.' : 'A instância saiu deste painel, mas continua no servidor.'
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-3 w-3" /> Usuário GHL Atrelado
              </Label>
              <Select value={ghlUserId} onValueChange={setGhlUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum usuário</SelectItem>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin mr-2" /> Carregando...
                    </div>
                  ) : (
                    ghlUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg border space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Unplug className="h-3 w-3" /> Sessão WhatsApp
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full h-8 text-[11px] font-bold bg-white dark:bg-slate-900"
                onClick={handleWhatsAppLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Link2Off className="h-3.5 w-3.5 mr-2" />}
                ENCERRAR SESSÃO NO CELULAR
              </Button>
              <p className="text-[9px] text-muted-foreground leading-tight">
                Use isso se o WhatsApp estiver "preso" ou se precisar liberar para um novo QR Code sem apagar a instância.
              </p>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-[11px] h-9"
                  onClick={() => setConfirmType('unlink')}
                >
                  Desvincular Painel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-[11px] h-9 text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmType('delete')}
                >
                  Excluir do Servidor
                </Button>
              </div>
              <Button className="w-full h-10" onClick={handleUpdate} disabled={isLoading || !name.trim()}>
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
                    ? 'Esta ação apagará a instância permanentemente do servidor e do painel.'
                    : 'A instância será removida deste painel, mas continuará existindo no servidor.'}
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
                Confirmar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
