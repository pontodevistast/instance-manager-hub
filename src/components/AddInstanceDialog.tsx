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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { Loader2, Plus, Link2, Info } from 'lucide-react';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onSuccess: () => void;
}

export function AddInstanceDialog({ open, onOpenChange, locationId, onSuccess }: AddInstanceDialogProps) {
  const [name, setName] = useState('');
  const [systemName, setSystemName] = useState('');
  const [tokenImport, setTokenImport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'new' | 'import'>('new');
  const { toast } = useToast();
  
  const { data: config } = useSubaccountConfig(locationId);

  // Gera o System Name automaticamente
  useEffect(() => {
    if (mode === 'new' && name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);
      setSystemName(slug);
    }
  }, [name, mode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      let finalInstanceToken = '';

      // 1. Criar no servidor UaZapi
      if (mode === 'new') {
        if (!config?.api_token || !config?.api_base_url) {
          throw new Error('Configuração de API (Base URL ou Token) não encontrada para esta subconta.');
        }

        const response = await fetch(`${config.api_base_url}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.api_token}`
          },
          body: JSON.stringify({
            name: name.trim(),
            systemName: systemName || 'uazapiGO',
            adminField01: locationId // Usamos para identificar a qual subconta pertence no servidor
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Erro ao criar instância no servidor.');
        }

        const data = await response.json();
        // Conforme o exemplo: o token pode estar em data.token ou data.instance.token
        finalInstanceToken = data.token || data.instance?.token;

        if (!finalInstanceToken) {
          throw new Error('O servidor não retornou um token de autenticação válido.');
        }
      } else {
        // Modo Importar
        finalInstanceToken = tokenImport.trim();
        if (!finalInstanceToken) throw new Error('O token da instância é obrigatório para importar.');
      }

      // 2. Salvar no Supabase
      const { error: dbError } = await supabase.from('instances').insert({
        location_id: locationId,
        instance_name: name.trim(),
        instance_token: finalInstanceToken,
        status: 'disconnected',
      });

      if (dbError) throw dbError;

      toast({ 
        title: mode === 'new' ? 'Instância Criada' : 'Instância Vinculada', 
        description: 'Dados salvos com sucesso.' 
      });
      
      setName('');
      setSystemName('');
      setTokenImport('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Adicionar WhatsApp</DialogTitle>
            <DialogDescription>
              {mode === 'new' 
                ? 'Registre uma nova conexão no servidor.' 
                : 'Vincule uma instância que já possui um token.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new" className="w-full mt-4" onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Criar Nova</TabsTrigger>
              <TabsTrigger value="import">Importar</TabsTrigger>
            </TabsList>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Instância</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Vendas"
                  required
                />
              </div>

              <TabsContent value="new" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sysName" className="flex items-center gap-2">
                    System Name
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="sysName"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    placeholder="uazapiGO"
                    className="font-mono text-xs"
                  />
                </div>
              </TabsContent>

              <TabsContent value="import" className="m-0 space-y-2">
                <Label htmlFor="tokenImp">Token da Instância (abc123xyz...)</Label>
                <Input
                  id="tokenImp"
                  value={tokenImport}
                  onChange={(e) => setTokenImport(e.target.value)}
                  placeholder="Insira o token retornado na criação"
                  required={mode === 'import'}
                />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : mode === 'new' ? <Plus className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              {mode === 'new' ? 'Criar Instância' : 'Vincular'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}