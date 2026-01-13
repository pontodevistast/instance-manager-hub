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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Instance } from '@/types/instance';
import { Loader2, RefreshCw, CheckCircle2, Copy, ShieldCheck, Info, Sparkles, Settings2 } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  onSuccess: () => void;
}

const WEBHOOK_URL = 'https://dev.bslabs.space/webhook/atualiza';
const QR_TIMEOUT_SECONDS = 60;

type ConnectionState = 'idle' | 'loading_qr' | 'waiting_for_scan' | 'connected' | 'expired' | 'creating';

export function ConnectDialog({ open, onOpenChange, instance, onSuccess }: ConnectDialogProps) {
  const [name, setName] = useState(instance.instance_name || '');
  const [manualId, setManualId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [localQr, setLocalQr] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_SECONDS);
  const { toast } = useToast();

  const fetchQRCode = useCallback(async (targetToken: string, action: 'create_instance' | 'get_qr' = 'get_qr') => {
    if (!targetToken && action === 'get_qr') return;
    
    setConnectionState(action === 'create_instance' ? 'creating' : 'loading_qr');
    setLocalQr(null);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          instanceName: targetToken || name,
          locationId: instance.location_id,
          friendlyName: name
        }),
      });

      if (!response.ok) throw new Error('Falha na comunicação com o servidor de instâncias.');

      const data = await response.json().catch(() => ({}));
      
      if (data.qrcode || data.qr || data.base64) {
        setLocalQr(data.qrcode || data.qr || data.base64);
      }
      
      setConnectionState('waiting_for_scan');
      setTimeLeft(QR_TIMEOUT_SECONDS);
      
      if (action === 'create_instance') {
        toast({ title: 'Instância Criada', description: 'O servidor está gerando seu QR Code agora.' });
      }
    } catch (error: any) {
      toast({ title: 'Erro na API', description: error.message, variant: 'destructive' });
      setConnectionState('idle');
    }
  }, [toast, instance.location_id, name]);

  useEffect(() => {
    if (instance.status === 'connected' && connectionState !== 'connected') {
      setConnectionState('connected');
      toast({ title: 'Conectado com Sucesso!' });
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 2000);
    }
  }, [instance.status, connectionState, onOpenChange, onSuccess, toast]);

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
    if (open && instance.instance_token && connectionState === 'idle') {
      fetchQRCode(instance.instance_token, 'get_qr');
    }
  }, [open, instance.instance_token, connectionState, fetchQRCode]);

  const handleAutoCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    fetchQRCode('', 'create_instance');
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim() || !manualToken.trim()) return;

    try {
      const { error } = await supabase
        .from('instances')
        .update({ 
          instance_name: name || manualId, 
          instance_token: manualToken 
        })
        .eq('id', instance.id);

      if (error) throw error;
      fetchQRCode(manualToken, 'get_qr');
    } catch (error: any) {
      toast({ title: 'Erro ao salvar manual', description: error.message, variant: 'destructive' });
    }
  };

  const formatQrCode = (qr: string) => {
    if (!qr) return null;
    return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Conexão</DialogTitle>
          <DialogDescription>
            Escolha como deseja vincular sua conta do WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {connectionState === 'connected' ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <p className="font-bold text-green-700">WhatsApp Conectado!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {!instance.instance_token && connectionState === 'idle' ? (
              <Tabs defaultValue="auto" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="auto" className="gap-2">
                    <Sparkles className="w-4 h-4" /> Automático
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="gap-2">
                    <Settings2 className="w-4 h-4" /> Manual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="auto" className="space-y-4">
                  <form onSubmit={handleAutoCreate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Instância</Label>
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Ex: WhatsApp Comercial" 
                      />
                      <p className="text-[10px] text-muted-foreground">O sistema criará automaticamente a instância na API para você.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={!name.trim()}>
                      Criar e Gerar QR Code
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <form onSubmit={handleManualSave} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        ID da Instância
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent>O identificador único criado no painel UaZapi.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Ex: minha-instancia-01" />
                    </div>
                    <div className="space-y-2">
                      <Label>Token da Instância</Label>
                      <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Bearer token da instância" />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full" disabled={!manualId.trim() || !manualToken.trim()}>
                      Salvar e Conectar
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  {['creating', 'loading_qr'].includes(connectionState) ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-muted rounded-xl gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Sincronizando com servidor...</p>
                    </div>
                  ) : (
                    <div className={`p-4 bg-white rounded-xl border-2 transition-all ${
                      connectionState === 'expired' ? 'border-destructive/30 grayscale' : 'border-primary/20 shadow-md'
                    }`}>
                      {localQr || instance.qr_code ? (
                        <img 
                          src={formatQrCode(localQr || instance.qr_code!)!} 
                          alt="QR Code" 
                          className={`w-48 h-48 object-contain ${connectionState === 'expired' ? 'blur-sm opacity-50' : ''}`}
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-center p-4">
                           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter leading-tight">Aguardando resposta do Webhook...</p>
                        </div>
                      )}

                      {connectionState === 'expired' && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <Button variant="secondary" size="sm" onClick={() => fetchQRCode(instance.instance_token || manualToken)}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {connectionState === 'waiting_for_scan' && (
                  <div className="w-full space-y-3">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                      <span>Expira em</span>
                      <span className={timeLeft < 10 ? "text-destructive" : ""}>{timeLeft}s</span>
                    </div>
                    <Progress value={(timeLeft / QR_TIMEOUT_SECONDS) * 100} className="h-1.5" />
                  </div>
                )}

                <div className="w-full pt-4 border-t space-y-2">
                  <Button variant="outline" className="w-full text-xs" onClick={() => onSuccess()}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" />
                    Verificar Conexão Agora
                  </Button>
                  <Button variant="ghost" className="w-full text-[10px]" onClick={() => fetchQRCode(instance.instance_token || manualToken)}>
                    Não apareceu? Tentar gerar novamente
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