import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubaccountConfig } from '@/hooks/use-subaccount-config';
import { uazapiFetch } from '@/lib/uazapi';
import type { Instance } from '@/types/instance';
import { Loader2, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const QR_TIMEOUT_SECONDS = 60;
type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [localQr, setLocalQr] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);

  const fetchQRCode = useCallback(async () => {
    if (!config?.api_base_url || !instance.instance_token) return;
    
    setConnectionState('loading_qr');
    setLocalQr(null);
    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/connect', {
        method: 'POST',
        instanceToken: instance.instance_token
      });

      const qr = data.qrcode || data.qrCodeBase64 || data.qr;
      if (qr) {
        setLocalQr(qr);
        setConnectionState('waiting_for_scan');
        setTimeLeft(QR_TIMEOUT_SECONDS);
      } else if (data.status === 'connected') {
        setConnectionState('connected');
      }
    } catch (error: any) {
      toast({ title: 'Erro ao gerar QR', description: error.message, variant: 'destructive' });
      setConnectionState('idle');
    }
  }, [config, instance.instance_token, toast]);

  const checkStatus = useCallback(async () => {
    if (!config?.api_base_url || !instance.instance_token || connectionState === 'connected' || !open) return;

    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/status', {
        instanceToken: instance.instance_token
      });

      if (data.instance?.status === 'connected') {
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
    } catch (e) {
      console.error('Erro ao verificar status:', e);
    }
  }, [config, instance, connectionState, open, onSuccess, toast, onOpenChange]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionState === 'waiting_for_scan' && open) {
      interval = setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [connectionState, open, checkStatus]);

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
    if (open && connectionState === 'idle') {
      fetchQRCode();
    }
  }, [open, connectionState, fetchQRCode]);

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
          <DialogDescription>Escaneie o código para vincular esta instância.</DialogDescription>
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
                    <Button variant="secondary" onClick={fetchQRCode}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
                    </Button>
                  </div>
                )}
              </div>

              {connectionState === 'waiting_for_scan' && (
                <div className="w-full space-y-3 text-center">
                  <Progress value={(timeLeft / QR_TIMEOUT_SECONDS) * 100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground font-medium">Aguardando leitura do QR Code...</p>
                </div>
              )}

              <div className="w-full pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={checkStatus}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" /> Verificar Conexão Agora
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}