import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubaccounts } from '@/hooks/use-subaccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ManageSubaccountDialog } from '@/components/ManageSubaccountDialog';
import { AddSubaccountDialog } from '@/components/AddSubaccountDialog';
import { Plus, LayoutGrid, ChevronRight, Search, Loader2, Settings2 } from 'lucide-react';

export default function ManagerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubaccount, setSelectedSubaccount] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: subaccounts, isLoading, refetch } = useSubaccounts();
  const navigate = useNavigate();

  const filteredAccounts = subaccounts?.filter(id => 
    id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Gestor</h1>
            <p className="text-muted-foreground">Gerencie todas as suas subcontas GoHighLevel em um só lugar.</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" /> Nova Subconta
          </Button>
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
                  Nenhuma subconta encontrada. Adicione uma acima para começar.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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