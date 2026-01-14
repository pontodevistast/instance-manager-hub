import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubaccounts } from '@/hooks/use-subaccounts';
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
import { Plus, LayoutGrid, ChevronRight, Search, Loader2, Settings2, Zap, RefreshCw, ShieldCheck } from 'lucide-react';

export default function ManagerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubaccount, setSelectedSubaccount] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [agencyToken, setAgencyToken] = useState('');
  
  const { data: subaccounts, isLoading, refetch } = useSubaccounts();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSaveAgencyToken = async () => {
    if (!agencyToken.trim()) return;
    setIsSavingToken(true);
    try {
      // Salva o token na tabela de agência como um token permanente (sem expiração)
      const { error } = await supabase.from('ghl_agency_tokens').insert({
        access_token: agencyToken.trim(),
        refresh_token: 'private_key',
        expires_at: null // Tokens privados não expiram
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
      const response = await fetch('https://onanrpmrgdfjsrtwckxi.supabase.co/functions/v1/sync-subaccounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao sincronizar. Verifique se salvou o Token de Agência.');
      
      toast({ title: 'Sincronização Concluída', description: data.message });
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro na Sincronização', description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAccounts = subaccounts?.filter(id => 
    id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Gestor</h1>
            <p className="text-muted-foreground">Integração Privada via API Key de Agência.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsTokenModalOpen(true)}>
              <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> Configurar API Key
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> Nova Subconta
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  <CardTitle>Subcontas Ativas</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncList} 
                    disabled={isSyncing}
                    className="h-9"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronizar CRM
                  </Button>
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar..." 
                      className="pl-9 h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredAccounts.length > 0 ? (
                <div className="divide-y">
                  {filteredAccounts.map((id) => (
                    <div 
                      key={id} 
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div 
                        className="flex items-center gap-4 cursor-pointer flex-1"
                        onClick={() => navigate(`/${id}/instances`)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {id.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{id}</p>
                          <p className="text-xs text-muted-foreground">Acessar painel da unidade</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubaccount(id);
                          }}
                        >
                          <Settings2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <ChevronRight 
                          className="h-5 w-5 text-muted-foreground cursor-pointer" 
                          onClick={() => navigate(`/${id}/instances`)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  Nenhuma subconta encontrada. Configure o API Key e clique em "Sincronizar CRM".
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configuração de API Privada</DialogTitle>
            <DialogDescription>
              Insira o seu <strong>Agency API Key</strong> para sincronização direta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Agency API Key (Bearer Token)</Label>
              <Input 
                type="password"
                value={agencyToken} 
                onChange={(e) => setAgencyToken(e.target.value)} 
                placeholder="Cole o token da agência aqui"
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-[10px] text-amber-700 dark:text-amber-400 space-y-1 border border-amber-200 dark:border-amber-800">
              <p className="font-bold uppercase flex items-center gap-1">
                <Zap className="h-3 w-3" /> Onde encontrar:
              </p>
              <p>Agency Settings {'>'} API Keys {'>'} Copie o Agency API Key.</p>
            </div>
            <Button className="w-full" onClick={handleSaveAgencyToken} disabled={isSavingToken || !agencyToken.trim()}>
              {isSavingToken ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Token Permanente
            </Button>
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
          locationId={selectedSubaccount}
          onSuccess={() => {
            setSelectedSubaccount(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

import { Save } from 'lucide-react';