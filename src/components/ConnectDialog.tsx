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
import { Loader2, RefreshCw, CheckCircle2, Copy, ShieldCheck } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const WEBHOOK_CONNECT_URL = 'https://dev.bslabs.space/webhook/atualiza';
const QR_TIMEOUT_SECONDS = 60; // Aumentado para 60s para dar mais margem

type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [token, setToken] = useState(instance.instance_token || '');
  const [localQr, setLocalQr] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const { toast } = useToast();

  // Função para buscar o QR Code
  const fetchQRCode = useCallback(async (targetToken: string) => {
    if (!targetToken) return;
    
    setConnectionState('loading_qr');
    setLocalQr(null);
    try {
      const response = await fetch(WEBHOOK_CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instanceName: targetToken,
          locationId: instance.location_id 
        }),
      });

      if (!response.ok) throw new Error('Falha ao solicitar QR Code ao servidor.');

      const data = await response.json().catch(() => ({}));
      
      // Se o webhook retornar o QR Code no corpo da resposta (comum em n8n/APIs)
      if (data.qrcode || data.qr || data.base64) {
        setLocalQr(data.qrcode || data.qr || data.base64);
      }
      
      setConnectionState('waiting_for_scan');
      setTimeLeft(QR_TIMEOUT_SECONDS);
    } catch (error: any) {
      toast({ title: 'Erro de Conexão', description: error.message, variant: 'destructive' });
      setConnectionState('idle');
    }
  }, [toast, instance.location_id]);

  // Monitora mudança de status vinda do banco (via Realtime no hook pai)
  useEffect(() => {
    if (instance.status === 'connected' && connectionState !== 'connected') {
      setConnectionState('connected');
      toast({ title: 'WhatsApp Conectado!', description: 'Sua instância está pronta.', variant: 'default' });
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 2000);
    }
  }, [instance.status, connectionState, onOpenChange, onSuccess, toast]);

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
    // Tenta detectar se é base64 puro
    return `data:image/png;base64,${qr}`;
  };

  const qrToDisplay = localQr || instance.qr_code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o código para vincular seu aparelho.
          </DialogDescription>
        </DialogHeader>

        {connectionState === 'connected' ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-700">Conectado!</h3>
              <p className="text-muted-foreground mt-2">Sincronizando dados...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!instance.instance_token ? (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Instância</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: WhatsApp Vendas" />
                </div>
                <div className="space-y-2">
                  <Label>Token UaZapi</Label>
                  <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Identificador da instância" />
                </div>
                <Button type="submit" className="w-full" disabled={!token.trim()}>
                  Gerar QR Code
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="relative group">
                  {connectionState === 'loading_qr' ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-muted rounded-xl space-y-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground font-medium">Gerando QR Code...</p>
                    </div>
                  ) : (
                    <div className={`relative p-4 bg-white rounded-xl border-2 transition-all duration-300 ${
                      connectionState === 'expired' ? 'border-destructive/30 grayscale' : 'border-primary/20 shadow-md'
                    }`}>
                      {qrToDisplay ? (
                        <img 
                          src={formatQrCode(qrToDisplay)!} 
                          alt="QR Code" 
                          className={`w-48 h-48 object-contain transition-all ${connectionState === 'expired' ? 'blur-sm opacity-50' : ''}`}
                        />
                      ) : (
                        <div className="w-48 h-48 flex flex-col items-center justify-center space-y-2 text-center">
                           <Skeleton className="w-full h-full absolute inset-0 rounded-md" />
                           <p className="relative z-10 text-[10px] text-muted-foreground px-4">Aguardando sinal do servidor...</p>
                        </div>
                      )}

                      {connectionState === 'expired' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="shadow-xl"
                            onClick={() => fetchQRCode(token)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Novo QR Code
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {connectionState === 'waiting_for_scan' && (
                  <div className="w-full space-y-3 text-center">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      <span>Expira em</span>
                      <span className={timeLeft < 10 ? "text-destructive" : ""}>{timeLeft}s</span>
                    </div>
                    <Progress value={(timeLeft / QR_TIMEOUT_SECONDS) * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      No WhatsApp: Configurações {'>'} Aparelhos conectados
                    </p>
                  </div>
                )}

                <div className="w-full pt-4 border-t space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full h-10 text-xs font-semibold" 
                    onClick={() => {
                      onSuccess(); // Força um refetch das instâncias
                      toast({ title: "Verificando...", description: "Checando status no servidor." });
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" />
                    Já escaneei? Verificar agora
                  </Button>
                  
                  <Button variant="ghost" className="w-full text-[11px] text-muted-foreground hover:text-primary" onClick={() => fetchQRCode(token)}>
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Tentar gerar novamente
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