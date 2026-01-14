import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubaccounts, Subaccount } from '@/hooks/use-subaccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ManageSubaccountDialog } from '@/components/ManageSubaccountDialog';
import { AddSubaccountDialog } from '@/components/AddSubaccountDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, LayoutGrid, ChevronRight, Search, Loader2, Settings2, Zap, RefreshCw, ShieldCheck, Building2, Save } from 'lucide-react';

export default function ManagerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubaccount, setSelectedSubaccount] = useState<Subaccount | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [agencyToken, setAgencyToken] = useState('');
  const [globalSettings, setGlobalSettings] = useState<{ ghl_client_id?: string, ghl_client_secret?: string }>({});

  const { data: subaccounts, isLoading, refetch } = useSubaccounts();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGlobalSettings() {
      const { data } = await supabase
        .from('integration_settings')
        .select('ghl_client_id, ghl_client_secret')
        .eq('location_id', 'agency')
        .maybeSingle();

      if (data) {
        setGlobalSettings(data);
      }
    }
    fetchGlobalSettings();
  }, [isTokenModalOpen]); // Refresh when modal closes as it might have changed

  const handleSaveAgencyToken = async () => {
    if (!agencyToken.trim()) return;
    setIsSavingToken(true);
    try {
      const { error } = await supabase.from('ghl_agency_tokens').insert({
        access_token: agencyToken.trim(),
        refresh_token: 'private_key',
        expires_at: null
      });

      if (error) throw error;

      toast({ title: 'Token Salvo', description: 'Agora você pode sincronizar suas subcontas.' });
      setIsTokenModalOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSyncList = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-subaccounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao sincronizar.');

      toast({ title: 'Sincronização Concluída', description: data.message });
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro na Sincronização', description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGHL = () => {
    const clientId = globalSettings.ghl_client_id;
    if (!clientId) {
      toast({
        title: "Configuração Necessária",
        description: "Configure o Client ID e Client Secret nas Configurações Globais antes de conectar.",
        variant: "destructive"
      });
      return;
    }

    const scopes = [
      'companies.readonly', 'locations.write', 'locations.readonly',
      'saas/company.read', 'saas/company.write', 'saas/location.read',
      'saas/location.write', 'snapshots.readonly', 'snapshots.write',
      'users.readonly', 'users.write', 'custom-menu-link.readonly',
      'custom-menu-link.write', 'marketplace-installer-details.readonly',
      'twilioaccount.read', 'phonenumbers.read', 'numberpools.read',
      'documents_contracts/list.readonly', 'documents_contracts/sendLink.write',
      'documents_contracts_template/sendLink.write', 'documents_contracts_template/list.readonly'
    ].join(' ');

    const redirectUri = window.location.origin + '/callback';
    const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}`;

    window.location.href = authUrl;
  };

  const filteredAccounts = subaccounts?.filter(acc =>
    (acc.account_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    acc.location_id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Gestor</h1>
            <p className="text-muted-foreground">Gerenciamento centralizado de unidades.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsTokenModalOpen(true)} className="rounded-xl border-primary/20 hover:bg-primary/5">
              <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> API Key Agência
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 px-6">
              <Plus className="h-4 w-4 mr-2" /> Nova Unidade
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Unidades & Subcontas</CardTitle>
                    <p className="text-xs text-muted-foreground">{filteredAccounts.length} resultados encontrados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncList}
                    disabled={isSyncing}
                    className="h-10 text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronizar CRM
                  </Button>
                  <div className="relative w-48 sm:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou ID..."
                      className="pl-10 h-10 rounded-xl bg-white border-muted"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                </div>
              ) : filteredAccounts.length > 0 ? (
                <div className="divide-y divide-muted/50">
                  {filteredAccounts.map((acc) => (
                    <div
                      key={acc.location_id}
                      className="flex items-center justify-between p-5 hover:bg-primary/[0.02] transition-all group relative cursor-pointer"
                      onClick={() => navigate(`/${acc.location_id}/instances`)}
                    >
                      <div className="flex items-center gap-5 flex-1 overflow-hidden">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center font-bold text-primary text-lg shrink-0 border border-primary/5 shadow-sm group-hover:scale-105 transition-transform">
                          {(acc.account_name || acc.location_id).substring(0, 1).toUpperCase()}
                        </div>
                        <div className="overflow-hidden space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                            {acc.account_name || 'Unidade sem nome'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded border border-muted-foreground/10 uppercase tracking-tighter">
                              ID: {acc.location_id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white border shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubaccount(acc);
                          }}
                        >
                          <Settings2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div className="h-10 w-10 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all text-muted-foreground">
                          <ChevronRight className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                    <Search className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-slate-400">Nenhum resultado</p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Configure o API Key e sincronize com o CRM para listar suas subcontas automaticamente.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais omitidos por brevidade (mantêm a mesma lógica) */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Configuração de API GHL</DialogTitle>
            <DialogDescription>
              Escolha entre usar um <strong>Agency API Key</strong> ou conectar via <strong>OAuth (V2)</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-4">
              <h3 className="text-sm font-bold border-b pb-2">Opção 1: OAuth V2 (Recomendado)</h3>
              <div className="bg-muted/30 p-4 rounded-xl border border-dashed text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  As credenciais OAuth agora são gerenciadas centralizadamente nas <strong>Configurações Globais</strong>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9"
                  onClick={() => {
                    setIsTokenModalOpen(false);
                    navigate('/settings/global');
                  }}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-2" />
                  Ir para Configurações Globais
                </Button>
              </div>
              <Button
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold"
                onClick={handleConnectGHL}
                disabled={!globalSettings.ghl_client_id}
              >
                <Zap className="h-4 w-4 mr-2" />
                Conectar via OAuth
              </Button>
            </div>

            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-bold border-b pb-2">Opção 2: Agency API Key (Antigo)</h3>
              <div className="space-y-2">
                <Input
                  type="password"
                  value={agencyToken}
                  onChange={(e) => setAgencyToken(e.target.value)}
                  placeholder="Cole o Agency API Key aqui"
                  className="h-10 rounded-lg text-xs"
                />
              </div>
              <Button variant="outline" className="w-full h-11 rounded-xl font-bold" onClick={handleSaveAgencyToken} disabled={isSavingToken || !agencyToken.trim()}>
                {isSavingToken ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Key Agência
              </Button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 space-y-1 border border-amber-200/50">
              <p className="font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Segurança:
              </p>
              <p>O OAuth é mais seguro e permite permissões granuladas. Os dados de Client ID/Secret são salvos localmente no seu navegador para esta sessão.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddSubaccountDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={(id) => {
          refetch();
          navigate(`/${id}/instances`);
        }}
      />

      {selectedSubaccount && (
        <ManageSubaccountDialog
          open={!!selectedSubaccount}
          onOpenChange={(open) => !open && setSelectedSubaccount(null)}
          locationId={selectedSubaccount.location_id}
          currentName={selectedSubaccount.account_name || ''}
          onSuccess={() => {
            setSelectedSubaccount(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}