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
import { Loader2, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const WEBHOOK_BASE_URL = 'https://dev.bslabs.space/webhook';
const QR_TIMEOUT_SECONDS = 60;

type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [token, setToken] = useState(instance.instance_token || '');
  const [localQr, setLocalQr] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const { toast } = useToast();

  const fetchQRCode = useCallback(async (targetToken: string) => {
    if (!targetToken) return;
    
    setConnectionState('loading_qr');
    setLocalQr(null);
    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/atualiza`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: targetToken }),
      });

      if (!response.ok) throw new Error('Falha ao solicitar QR Code.');

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        setLocalQr(data.qrCodeBase64 || data.qrcode || data.qr);
      } else {
        const blob = await response.blob();
        setLocalQr(URL.createObjectURL(blob));
      }
      
      setConnectionState('waiting_for_scan');
      setTimeLeft(QR_TIMEOUT_SECONDS);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setConnectionState('idle');
    }
  }, [toast]);

  // Função para verificar status no servidor (Polling), igual ao n8n
  const checkStatus = useCallback(async () => {
    if (!token || connectionState === 'connected' || !open) return;

    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: token }),
      });

      if (response.ok) {
        const data = await response.json();
        // Lógica de verificação do n8n
        const statusData = Array.isArray(data) ? data[0] : data;
        const isConnected = 
          statusData?.instance?.status === 'connected' && 
          statusData?.status?.connected === true;

        if (isConnected) {
          // Atualiza o Supabase para que o resto do app saiba que está online
          await supabase
            .from('instances')
            .update({ status: 'connected', qr_code: null })
            .eq('id', instance.id);

          setConnectionState('connected');
          toast({ title: 'WhatsApp Conectado!' });
          setTimeout(() => {
            onOpenChange(false);
            onSuccess();
          }, 2000);
        }
      }
    } catch (e) {
      console.error('Erro ao verificar status:', e);
    }
  }, [token, connectionState, open, instance.id, onOpenChange, onSuccess, toast]);

  // Efeito de Polling (5 segundos, igual ao n8n)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionState === 'waiting_for_scan' && open) {
      interval = setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [connectionState, open, checkStatus]);

  // Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (connectionState === 'waiting_for_scan' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && connectionState === 'waiting_for_scan') {
      setConnectionState('expired');
    }
    return () => clearInterval(timer);
  }, [connectionState, timeLeft]);

  useEffect(() => {
    if (open && token && connectionState === 'idle') {
      fetchQRCode(token);
    }
  }, [open, token, connectionState, fetchQRCode]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    try {
      await supabase
        .from('instances')
        .update({ instance_name: name, instance_token: token })
        .eq('id', instance.id);
      fetchQRCode(token);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const formatQrCode = (qr: string) => {
    if (!qr) return null;
    if (qr.startsWith('data:') || qr.startsWith('blob:')) return qr;
    return `data:image/png;base64,${qr}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>Escaneie o código para vincular.</DialogDescription>
        </DialogHeader>

        {connectionState === 'connected' ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-700">Conectado com sucesso!</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {!instance.instance_token && connectionState === 'idle' ? (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Token UaZapi</Label>
                  <Input value={token} onChange={(e) => setToken(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">Gerar QR Code</Button>
              </form>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="relative p-4 bg-white rounded-xl border-2 border-primary/20 shadow-md">
                  {connectionState === 'loading_qr' ? (
                    <div className="w-48 h-48 flex flex-col items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : localQr ? (
                    <img src={formatQrCode(localQr)!} alt="QR Code" className={`w-48 h-48 object-contain ${connectionState === 'expired' ? 'blur-sm opacity-50' : ''}`} />
                  ) : (
                    <Skeleton className="w-48 h-48" />
                  )}

                  {connectionState === 'expired' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <Button variant="secondary" onClick={() => fetchQRCode(token)}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
                      </Button>
                    </div>
                  )}
                </div>

                {connectionState === 'waiting_for_scan' && (
                  <div className="w-full space-y-3 text-center">
                    <Progress value={(timeLeft / QR_TIMEOUT_SECONDS) * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">Verificando conexão a cada 5s...</p>
                  </div>
                )}

                <div className="w-full pt-4 border-t flex flex-col gap-2">
                  <Button variant="outline" className="w-full" onClick={checkStatus}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" /> Verificar Status Agora
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