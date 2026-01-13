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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { Loader2, Plus, Link2 } from 'lucide-react';

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
  const [mode, setMode] = useState<'new' | 'import'>('new');
  const { toast } = useToast();
  
  // Busca configurações globais da subconta (Token da API e Base URL)
  const { data: config } = useSubaccountConfig(locationId);

  const generateRandomToken = () => {
    return 'inst_' + Math.random().toString(36).substring(2, 10);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === 'import' && !token.trim()) return;
    
    // Verifica se temos as configurações globais para criar no servidor
    if (mode === 'new' && (!config?.api_token || !config?.api_base_url)) {
      toast({ 
        title: 'Configuração incompleta', 
        description: 'Configure o Global API Token na aba Integração antes de criar novas instâncias.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalToken = mode === 'new' ? generateRandomToken() : token.trim();

      // 1. Criar no servidor UaZapi (apenas se for nova)
      if (mode === 'new') {
        const createRes = await fetch(`${config.api_base_url}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.api_token}`
          },
          body: JSON.stringify({
            instanceName: finalToken,
            token: finalToken // Usando o token como o identificador da instância
          })
        });

        if (!createRes.ok) {
          const errData = await createRes.json();
          throw new Error(errData.message || 'Erro ao criar instância no servidor UaZapi.');
        }
      }

      // 2. Salvar no Supabase
      const { error: dbError } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: name.trim(),
        instance_token: finalToken,
        status: 'disconnected',
      });

      if (dbError) throw dbError;

      toast({ 
        title: mode === 'new' ? 'Instância Criada' : 'Instância Importada', 
        description: 'Instância configurada com sucesso no servidor e no painel.' 
      });
      
      setName('');
      setToken('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao processar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Adicionar Conexão</DialogTitle>
            <DialogDescription>
              {mode === 'new' 
                ? 'Uma nova instância será gerada automaticamente no servidor UaZapi.' 
                : 'Vincule uma instância que já existe no seu servidor.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new" className="w-full mt-4" onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Criar Nova</TabsTrigger>
              <TabsTrigger value="import">Importar Existente</TabsTrigger>
            </TabsList>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Amigável</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: WhatsApp Vendas"
                  required
                />
              </div>

              <TabsContent value="import" className="m-0 space-y-2">
                <Label htmlFor="token">Token / ID da Instância</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Insira o ID técnico da instância"
                  required={mode === 'import'}
                />
              </TabsContent>

              <TabsContent value="new" className="m-0">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    O sistema usará o <strong>Global API Token</strong> da subconta para criar esta conexão automaticamente no servidor.
                  </p>
                  {!config?.api_token && (
                    <p className="text-[10px] text-destructive font-bold">
                      ⚠️ Global API Token não configurado!
                    </p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : mode === 'new' ? (
                <Plus className="h-4 w-4 mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              {mode === 'new' ? 'Criar no Servidor' : 'Importar Conexão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}