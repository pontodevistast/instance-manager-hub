import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from '@/contexts/LocationContext';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const { locationId } = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your current session details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Location ID</p>
            <p className="text-sm text-muted-foreground font-mono">{locationId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
