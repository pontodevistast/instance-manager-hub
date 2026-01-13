import { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export function LoginView() {
  const [inputValue, setInputValue] = useState('');
  const { setLocationId } = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setLocationId(inputValue.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">WhatsApp Manager</CardTitle>
            <CardDescription className="mt-2">
              Enter your Location ID to access the dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter Location ID"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12" disabled={!inputValue.trim()}>
              Access Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
