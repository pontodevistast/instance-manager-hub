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
import type { Instance } from '@/types/instance';
import { Loader2 } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const WEBHOOK_CONNECT_URL = 'https://dev.bslabs.space/webhook/atualiza';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [token, setToken] = useState(instance.instance_token || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast({ title: 'Erro', description: 'O API Token é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Chamar o webhook do n8n para gerar o QR Code PRIMEIRO
      const response = await fetch(WEBHOOK_CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: token,
        }),
      });

      if (!response.ok) throw new Error('Falha ao gerar QR Code no servidor.');

      // 2. Tentar ler a resposta como Base64 ou Blob
      let qrCodeData = '';
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        qrCodeData = data.qrCodeBase64 || '';
      } else {
        const blob = await response.blob();
        qrCodeData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // 3. Atualizar os dados da instância no banco de dados, incluindo o novo QR Code
      const { error: dbError } = await supabase
        .from('instances')
        .update({ 
          instance_name: name,
          instance_token: token,
          qr_code: qrCodeData,
          status: 'disconnected' // Garante que volta para disconnected para mostrar o QR
        })
        .eq('id', instance.id);

      if (dbError) throw dbError;

      toast({
        title: 'Conexão atualizada',
        description: 'QR Code gerado e salvo com sucesso.',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao processar conexão.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar WhatsApp</DialogTitle>
          <DialogDescription>
            Configure o identificador único da sua instância UaZapi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Amigável</Label>
            <Input
              id="name"
              placeholder="Ex: Comercial WhatsApp"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">API Token (Instância UaZapi)</Label>
            <Input
              id="token"
              placeholder="Digite o identificador da instância"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !token.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Gerando QR Code...' : 'Salvar e Gerar QR Code'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}