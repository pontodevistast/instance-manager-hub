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

  // Gera um token aleatório simples para novas instâncias
  const generateRandomToken = () => {
    return 'inst_' + Math.random().toString(36).substring(2, 10);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === 'import' && !token.trim()) return;

    setIsLoading(true);
    try {
      // Se for modo "novo", geramos um token único automaticamente
      const finalToken = mode === 'new' ? generateRandomToken() : token.trim();

      const { error } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: name.trim(),
        instance_token: finalToken,
        status: 'disconnected',
      });

      if (error) throw error;

      toast({ 
        title: mode === 'new' ? 'Instância Criada' : 'Instância Importada', 
        description: 'Agora você pode prosseguir com a conexão via QR Code.' 
      });
      
      setName('');
      setToken('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
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
              Escolha como deseja adicionar seu WhatsApp ao painel.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new" className="w-full mt-4" onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Criar Nova</TabsTrigger>
              <TabsTrigger value="import">Importar Existente</TabsTrigger>
            </TabsList>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Instância</Label>
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
                  placeholder="Insira o ID existente no servidor"
                  required={mode === 'import'}
                />
                <p className="text-[10px] text-muted-foreground">
                  Use esta opção se você já tem uma instância criada no UaZapi.
                </p>
              </TabsContent>

              <TabsContent value="new" className="m-0">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O sistema gerará um identificador único automaticamente para esta nova conexão.
                  </p>
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
              {mode === 'new' ? 'Criar Instância' : 'Importar Instância'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}