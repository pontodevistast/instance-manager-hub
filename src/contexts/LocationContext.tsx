import React, { createContext, useContext, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface LocationContextType {
  locationId: string | null;
  logout: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();

  const logout = () => {
    navigate('/login');
  };

  return (
    <LocationContext.Provider value={{ locationId: locationId || null, logout }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation deve ser usado dentro de um LocationProvider');
  }
  return context;
}