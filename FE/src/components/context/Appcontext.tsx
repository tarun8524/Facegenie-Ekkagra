import { createContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export const AppContext = createContext(null);

export const AppProviders = ({ children }: Props) => {
  const location = useLocation();

  const value: any = {
    location
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};