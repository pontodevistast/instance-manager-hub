import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LocationContextType {
  locationId: string | null;
  setLocationId: (id: string | null) => void;
  logout: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locationId, setLocationId] = useState<string | null>(null);

  const logout = () => setLocationId(null);

  return (
    <LocationContext.Provider value={{ locationId, setLocationId, logout }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
