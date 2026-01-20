export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  location: string | null;
  login: (email: string, password: string, location: string | null) => Promise<void>;
  logout: () => void;
}

export interface KPICard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}