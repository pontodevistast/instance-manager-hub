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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Info } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/use-global-settings';

interface AddSubaccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (locationId: string) => void;
}

export function AddSubaccountDialog({ open, onOpenChange, onSuccess }: AddSubaccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: globalSettings } = useGlobalSettings();

  const [form, setForm] = useState({
    location_id: '',
    account_name: '',
    ghl_token: '',
    api_token: '',
    api_base_url: '',
  });

  // No pre-fill needed, using placeholders to show global settings

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location_id.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ghl_uazapi_config')
        .insert({
          location_id: form.location_id.trim(),
          account_name: form.account_name.trim() || null,
          ghl_token: form.ghl_token.trim() || null,
          api_token: form.api_token.trim() || null,
          api_base_url: form.api_base_url.trim() || null, // Allow null to use global
          ignore_groups: true,
        });

      if (error) throw error;

      toast({ title: 'Subconta criada', description: 'Configurações de integração salvas com sucesso.' });
      onSuccess(form.location_id.trim());
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Nova Subconta</DialogTitle>
            <DialogDescription>
              Configure o identificador e os dados de integração da nova unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locId">Location ID (GHL)</Label>
                <Input
                  id="locId"
                  value={form.location_id}
                  onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                  placeholder="ID da Subconta"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accName">Nome da Conta</Label>
                <Input
                  id="accName"
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  placeholder="Ex: Unidade Centro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ghlToken">GHL Bearer Token</Label>
              <Input
                id="ghlToken"
                type="password"
                value={form.ghl_token}
                onChange={(e) => setForm({ ...form, ghl_token: e.target.value })}
                placeholder="Token de acesso da subconta"
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-primary">Configurações de API (UaZapi)</h4>
                {globalSettings?.global_api_token && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Info className="h-2.5 w-2.5" /> Global Configurado
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl" className="flex items-center justify-between">
                    API Base URL
                    <span className="text-[10px] text-muted-foreground font-normal">Opcional (Usa Global)</span>
                  </Label>
                  <Input
                    id="apiUrl"
                    value={form.api_base_url}
                    onChange={(e) => setForm({ ...form, api_base_url: e.target.value })}
                    placeholder={globalSettings?.api_base_url || "https://api.uazapi.com"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiToken" className="flex items-center justify-between">
                    Global API Token
                    <span className="text-[10px] text-muted-foreground font-normal">Opcional (Usa Global)</span>
                  </Label>
                  <Input
                    id="apiToken"
                    type="password"
                    value={form.api_token}
                    onChange={(e) => setForm({ ...form, api_token: e.target.value })}
                    placeholder={globalSettings?.global_api_token ? "••••••••••••" : "Token mestre do servidor"}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !form.location_id.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Subconta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}