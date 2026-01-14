import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubaccounts } from '@/hooks/use-subaccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManageSubaccountDialog } from '@/components/ManageSubaccountDialog';
import { AddSubaccountDialog } from '@/components/AddSubaccountDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, LayoutGrid, ChevronRight, Search, Loader2, Settings2, Zap } from 'lucide-react';

export default function ManagerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubaccount, setSelectedSubaccount] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGhlModalOpen, setIsGhlModalOpen] = useState(false);
  const { data: subaccounts, isLoading, refetch } = useSubaccounts();
  const navigate = useNavigate();

  const [ghlCreds, setGhlCreds] = useState({
    clientId: localStorage.getItem('ghl_client_id') || '',
    clientSecret: localStorage.getItem('ghl_client_secret') || '',
  });

  const handleGhlConnect = () => {
    localStorage.setItem('ghl_client_id', ghlCreds.clientId);
    localStorage.setItem('ghl_client_secret', ghlCreds.clientSecret);
    
    const scopes = [
      'locations.readonly',
      'locations.write',
      'messages.readonly',
      'messages.write',
      'contacts.readonly'
    ].join(' ');
    
    const redirectUri = window.location.origin + '/callback';
    const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${redirectUri}&client_id=${ghlCreds.clientId}&scope=${scopes}`;
    
    window.location.href = authUrl;
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
            <p className="text-muted-foreground">Gerencie todas as suas subcontas conectadas.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsGhlModalOpen(true)}>
              <Zap className="h-4 w-4 mr-2 text-amber-500" /> Sincronizar CRM
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> Nova Subconta
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  <CardTitle>Subcontas Ativas</CardTitle>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar subconta..." 
                    className="pl-9 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
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
                          <p className="text-xs text-muted-foreground">Clique para acessar o painel</p>
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
                  Nenhuma subconta encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isGhlModalOpen} onOpenChange={setIsGhlModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar ao CRM</DialogTitle>
            <DialogDescription>
              Insira as credenciais do seu aplicativo para sincronizar subcontas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input 
                value={ghlCreds.clientId} 
                onChange={(e) => setGhlCreds({...ghlCreds, clientId: e.target.value})} 
                placeholder="Ex: 65e23..."
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input 
                type="password"
                value={ghlCreds.clientSecret} 
                onChange={(e) => setGhlCreds({...ghlCreds, clientSecret: e.target.value})}
              />
            </div>
            <div className="bg-muted p-3 rounded-lg text-[10px] space-y-1">
              <p className="font-bold">Redirect URI para configurar no portal:</p>
              <code className="block bg-background p-1 rounded border overflow-x-auto">
                {window.location.origin}/callback
              </code>
            </div>
            <Button className="w-full" onClick={handleGhlConnect} disabled={!ghlCreds.clientId || !ghlCreds.clientSecret}>
              Iniciar Autorização OAuth
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