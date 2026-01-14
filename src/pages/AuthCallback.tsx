import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setErrorMsg('Código de autorização não encontrado na URL.');
      return;
    }

    async function processAuth() {
      try {
        const clientId = localStorage.getItem('ghl_client_id');
        const clientSecret = localStorage.getItem('ghl_client_secret');

        if (!clientId || !clientSecret) {
          throw new Error('Configure as credenciais no painel antes de conectar.');
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            clientId,
            clientSecret,
            redirectUri: window.location.origin + '/callback'
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao sincronizar');

        await supabase.from('ghl_agency_tokens').insert({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          location_id: data.locationId,
          company_id: data.companyId,
          expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
        });

        setStatus('success');
        toast({ title: 'Conectado!', description: 'Sincronizando contas...' });

        setTimeout(() => navigate('/'), 2000);
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message);
      }
    }

    processAuth();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold">Autenticando...</h2>
            <p className="text-sm text-muted-foreground">Estamos vinculando sua conta ao sistema.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Sucesso!</h2>
            <p className="text-sm text-muted-foreground">Conexão estabelecida. Voltando ao painel...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Erro na Conexão</h2>
            <p className="text-sm text-destructive">{errorMsg}</p>
            <button onClick={() => navigate('/')} className="text-sm underline mt-4">Voltar</button>
          </>
        )}
      </div>
    </div>
  );
}