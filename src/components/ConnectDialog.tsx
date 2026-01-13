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
import { Loader2, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const QR_TIMEOUT_SECONDS = 60;
type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired' | 'error';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [localQr, setLocalQr] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: config } = useSubaccountConfig(instance.location_id);

  const fetchQRCode = useCallback(async () => {
    if (!config?.api_base_url || !instance.instance_token) {
      setConnectionState('error');
      setErrorMessage("Token da instância não encontrado.");
      return;
    }
    
    setConnectionState('loading_qr');
    setLocalQr(null);
    setErrorMessage(null);
    
    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/connect', {
        method: 'POST',
        instanceToken: instance.instance_token
      });

      // A API pode retornar o QR em vários campos dependendo da versão
      const qr = data.qrcode || data.qrCodeBase64 || data.qr || data.code || (typeof data === 'string' ? data : null);
      
      if (qr && typeof qr === 'string') {
        setLocalQr(qr);
        setConnectionState('waiting_for_scan');
        setTimeLeft(QR_TIMEOUT_SECONDS);
      } else if (data.status === 'connected' || data.instance?.status === 'connected') {
        setConnectionState('connected');
      } else {
        throw new Error("Não foi possível obter o QR Code da API.");
      }
    } catch (error: any) {
      console.error('Erro no fetchQRCode:', error);
      setConnectionState('error');
      setErrorMessage(error.message || "Erro desconhecido ao gerar QR Code");
    }
  }, [config, instance.instance_token]);

  const checkStatus = useCallback(async () => {
    if (!config?.api_base_url || !instance.instance_token || connectionState === 'connected' || !open) return;

    try {
      const data = await uazapiFetch(config.api_base_url, '/instance/status', {
        instanceToken: instance.instance_token
      });

      if (data.instance?.status === 'connected' || data.status === 'connected') {
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
    if (open && (connectionState === 'idle' || connectionState === 'error')) {
      fetchQRCode();
    }
  }, [open]);

  const formatQrCode = (qr: string) => {
    if (!qr) return null;
    if (qr.startsWith('data:') || qr.startsWith('blob:')) return qr;
    // Se a string não tiver o prefixo, adicionamos como PNG
    return `data:image/png;base64,${qr}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no seu celular {'>'} Configurações {'>'} Dispositivos Conectados.
          </DialogDescription>
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
                  <div className="w-48 h-48 flex flex-col items-center justify-center bg-muted/50 rounded-lg">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] mt-2 text-muted-foreground">Gerando código...</p>
                  </div>
                ) : connectionState === 'error' ? (
                  <div className="w-48 h-48 flex flex-col items-center justify-center bg-destructive/5 rounded-lg border border-destructive/20 p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                    <p className="text-[10px] text-destructive font-medium leading-tight">
                      {errorMessage || "Não foi possível carregar o QR Code"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={fetchQRCode} className="mt-2 h-7 text-[10px]">
                      Tentar Novamente
                    </Button>
                  </div>
                ) : localQr ? (
                  <img 
                    src={formatQrCode(localQr)!} 
                    alt="QR Code" 
                    className={`w-48 h-48 object-contain transition-all duration-300 ${connectionState === 'expired' ? 'blur-sm opacity-30' : ''}`} 
                  />
                ) : (
                  <Skeleton className="w-48 h-48" />
                )}

                {connectionState === 'expired' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4 text-center">
                    <p className="text-xs font-bold mb-2">Código Expirado</p>
                    <Button size="sm" variant="secondary" onClick={fetchQRCode}>
                      <RefreshCw className="w-3 h-3 mr-2" /> Gerar Novo
                    </Button>
                  </div>
                )}
              </div>

              {connectionState === 'waiting_for_scan' && (
                <div className="w-full space-y-3 text-center">
                  <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mb-1">
                    <span>Expira em {timeLeft}s</span>
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Aguardando leitura
                    </span>
                  </div>
                  <Progress value={(timeLeft / QR_TIMEOUT_SECONDS) * 100} className="h-1.5" />
                </div>
              )}

              <div className="w-full pt-4 border-t space-y-2">
                <Button variant="outline" className="w-full text-xs h-9" onClick={checkStatus} disabled={connectionState === 'loading_qr'}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" /> Já escaneei, verificar agora
                </Button>
                {connectionState === 'waiting_for_scan' && (
                   <Button variant="ghost" className="w-full text-[10px] h-7 text-muted-foreground" onClick={fetchQRCode}>
                      Problemas com o código? Clique para recarregar
                   </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}