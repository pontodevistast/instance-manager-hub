import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Instance } from '@/types/instance';
import { Loader2, RefreshCw, CheckCircle2, Copy, Smartphone } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const WEBHOOK_CONNECT_URL = 'https://dev.bslabs.space/webhook/atualiza';
const QR_TIMEOUT_SECONDS = 40;

type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [token, setToken] = useState(instance.instance_token || '');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const { toast } = useToast();

  // Função para buscar o QR Code
  const fetchQRCode = useCallback(async (targetToken: string) => {
    if (!targetToken) return;
    
    setConnectionState('loading_qr');
    try {
      const response = await fetch(WEBHOOK_CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: targetToken }),
      });

      if (!response.ok) throw new Error('Falha ao gerar QR Code.');

      // O webhook atualiza o banco. Vamos esperar o Realtime ou forçar um refresh visual
      // No fluxo do n8n, ele costuma retornar o QR ou apenas dar 200 OK.
      // Se ele retorna o QR, atualizamos aqui, senão o banco fará isso via Realtime.
      
      setConnectionState('waiting_for_scan');
      setTimeLeft(QR_TIMEOUT_SECONDS);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setConnectionState('idle');
    }
  }, [toast]);

  // Monitora mudança de status para fechar automaticamente
  useEffect(() => {
    if (instance.status === 'connected' && connectionState !== 'connected') {
      setConnectionState('connected');
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 2500);
    }
  }, [instance.status, connectionState, onOpenChange, onSuccess]);

  // Efeito de contagem regressiva
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (connectionState === 'waiting_for_scan' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && connectionState === 'waiting_for_scan') {
      setConnectionState('expired');
    }
    return () => clearInterval(timer);
  }, [connectionState, timeLeft]);

  // Iniciar busca de QR se já houver token ao abrir
  useEffect(() => {
    if (open && token && connectionState === 'idle') {
      fetchQRCode(token);
    }
  }, [open, token, connectionState, fetchQRCode]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    try {
      const { error } = await supabase
        .from('instances')
        .update({ instance_name: name, instance_token: token })
        .eq('id', instance.id);

      if (error) throw error;
      fetchQRCode(token);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const formatQrCode = (qr: string) => {
    if (!qr) return null;
    if (qr.startsWith('data:')) return qr;
    return `data:image/png;base64,${qr}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Copiado!', description: 'Código de emparelhamento copiado.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Siga as instruções para conectar sua instância.
          </DialogDescription>
        </DialogHeader>

        {connectionState === 'connected' ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-700">Conectado com Sucesso!</h3>
              <p className="text-muted-foreground mt-2">Esta janela fechará automaticamente...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!instance.instance_token ? (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Amigável</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: WhatsApp Vendas" />
                </div>
                <div className="space-y-2">
                  <Label>Token da Instância (UaZapi)</Label>
                  <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Digite o identificador" />
                </div>
                <Button type="submit" className="w-full" disabled={!token.trim()}>
                  Próximo Passo: Gerar QR Code
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="relative group">
                  {connectionState === 'loading_qr' ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-muted rounded-xl space-y-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Gerando código...</p>
                    </div>
                  ) : (
                    <div className={`relative p-4 bg-white rounded-xl border-2 transition-all duration-300 ${
                      connectionState === 'expired' ? 'border-destructive/30 grayscale' : 'border-primary/20 shadow-sm'
                    }`}>
                      {instance.qr_code ? (
                        <img 
                          src={formatQrCode(instance.qr_code)!} 
                          alt="QR Code" 
                          className={`w-48 h-48 object-contain transition-all ${connectionState === 'expired' ? 'blur-sm opacity-50' : ''}`}
                        />
                      ) : (
                        <Skeleton className="w-48 h-48 rounded-md" />
                      )}

                      {connectionState === 'expired' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="shadow-lg"
                            onClick={() => fetchQRCode(token)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar QR
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {connectionState === 'waiting_for_scan' && (
                  <div className="w-full space-y-2 text-center">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <span>Escaneie em</span>
                      <span>{timeLeft}s</span>
                    </div>
                    <Progress value={(timeLeft / QR_TIMEOUT_SECONDS) * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground pt-2">
                      Abra o WhatsApp no seu celular {'>'} Dispositivos Conectados {'>'} Conectar um Aparelho
                    </p>
                  </div>
                )}

                <div className="w-full pt-4 border-t space-y-3">
                  <p className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-widest">Opções Alternativas</p>
                  <Button variant="outline" className="w-full h-10 text-xs" onClick={copyToClipboard}>
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    Copiar Código de Emparelhamento
                  </Button>
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => fetchQRCode(token)}>
                    Não está funcionando? Tente gerar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}