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
import { useNavigate } from 'react-router-dom';
import type { Instance } from '@/types/instance';
import { Loader2, RefreshCw, CheckCircle2, Copy, AlertCircle } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const QR_TIMEOUT_SECONDS = 40;

type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired' | 'no_settings';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Função para buscar o QR Code usando as configurações globais
  const fetchQRCode = useCallback(async (instanceName: string) => {
    if (!instanceName) return;
    
    setConnectionState('loading_qr');
    try {
      // 1. Buscar configurações globais
      const { data: settings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('location_id', instance.location_id)
        .maybeSingle();

      if (!settings || !settings.global_api_token) {
        setConnectionState('no_settings');
        return;
      }

      // 2. Chamar Webhook ou API diretamente
      // Aqui usamos o endpoint padrão do UaZapi se o webhook não estiver definido
      const apiUrl = settings.api_base_url || 'https://api.uazapi.com';
      
      const response = await fetch(`${apiUrl}/instance/connect`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': settings.global_api_token
        },
        body: JSON.stringify({ instanceName }),
      });

      if (!response.ok) throw new Error('Falha ao gerar QR Code na API.');

      setConnectionState('waiting_for_scan');
      setTimeLeft(QR_TIMEOUT_SECONDS);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setConnectionState('idle');
    }
  }, [instance.location_id, toast]);

  useEffect(() => {
    if (instance.status === 'connected' && connectionState !== 'connected') {
      setConnectionState('connected');
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 2500);
    }
  }, [instance.status, connectionState, onOpenChange, onSuccess]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (connectionState === 'waiting_for_scan' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && connectionState === 'waiting_for_scan') {
      setConnectionState('expired');
    }
    return () => clearInterval(timer);
  }, [connectionState, timeLeft]);

  // Se já tem nome, tenta gerar QR ao abrir
  useEffect(() => {
    if (open && name && connectionState === 'idle') {
      fetchQRCode(name);
    }
  }, [open, name, connectionState, fetchQRCode]);

  const handleStartConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const { error } = await supabase
        .from('instances')
        .update({ instance_name: name })
        .eq('id', instance.id);

      if (error) throw error;
      fetchQRCode(name);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  if (connectionState === 'no_settings') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md text-center py-8">
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="mb-2">Configuração Ausente</DialogTitle>
          <DialogDescription className="mb-6">
            Você precisa configurar a URL da API e o Token Global antes de conectar instâncias.
          </DialogDescription>
          <Button onClick={() => {
            onOpenChange(false);
            navigate(`/${instance.location_id}/settings`);
          }}>
            Ir para Configurações
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Defina o nome da instância para gerar o QR Code.
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
            {!instance.instance_name || connectionState === 'idle' ? (
              <form onSubmit={handleStartConnection} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Instância</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: WhatsApp Vendas" />
                </div>
                <Button type="submit" className="w-full" disabled={!name.trim()}>
                  Gerar QR Code
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
                          src={instance.qr_code.startsWith('data:') ? instance.qr_code : `data:image/png;base64,${instance.qr_code}`} 
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
                            onClick={() => fetchQRCode(name)}
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
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}