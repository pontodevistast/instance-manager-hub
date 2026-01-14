import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uazapiFetch } from '@/lib/uazapi';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from '@/types/instance';

export function useInstanceActions(locationId: string | null) {
    const { toast } = useToast();
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isFetchingQr, setIsFetchingQr] = useState(false);

    const handleLogout = useCallback(async (instance: Instance, apiBaseUrl: string, onSuccess?: () => void) => {
        if (!apiBaseUrl || !instance.instance_token) return;

        setIsDisconnecting(true);
        try {
            // Tenta logout para limpar a sessão no servidor
            await uazapiFetch(apiBaseUrl, '/instance/logout', {
                method: 'POST',
                instanceToken: instance.instance_token
            }).catch(() => {
                // Fallback para disconnect se logout não existir/falhar
                return uazapiFetch(apiBaseUrl, '/instance/disconnect', {
                    method: 'POST',
                    instanceToken: instance.instance_token!
                });
            });

            await supabase
                .from('instances')
                .update({ status: 'disconnected', qr_code: null })
                .eq('id', instance.id);

            toast({ title: 'Desconectado', description: 'WhatsApp desvinculado e sessão encerrada.' });
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast({ title: 'Erro ao desconectar', description: error.message, variant: 'destructive' });
        } finally {
            setIsDisconnecting(false);
        }
    }, [toast]);

    const fetchQrCode = useCallback(async (instance: Instance, apiBaseUrl: string) => {
        if (!apiBaseUrl || !instance.instance_token) return null;

        setIsFetchingQr(true);
        try {
            const data = await uazapiFetch(apiBaseUrl, '/instance/connect', {
                method: 'POST',
                instanceToken: instance.instance_token
            });

            const findQr = (obj: any): string | null => {
                if (!obj) return null;
                if (typeof obj === 'string' && (obj.length > 100 || obj.includes('base64'))) return obj;
                const possibleKeys = ['qrcode', 'qrCodeBase64', 'qr', 'code', 'base64', 'content'];
                for (const key of possibleKeys) {
                    if (obj[key] && typeof obj[key] === 'string') return obj[key];
                }
                if (obj.instance && typeof obj.instance === 'object') return findQr(obj.instance);
                if (obj.data && typeof obj.data === 'object') return findQr(obj.data);
                return null;
            };

            const qr = findQr(data);
            if (qr) {
                // Formata se não houver prefixo data:image
                const formattedQr = qr.startsWith('data:image') ? qr : `data:image/png;base64,${qr.replace(/^data:image\/\w+;base64,/, '')}`;
                return formattedQr;
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar QR:', error);
            return null;
        } finally {
            setIsFetchingQr(false);
        }
    }, []);

    return {
        handleLogout,
        fetchQrCode,
        isDisconnecting,
        isFetchingQr
    };
}
