import { create } from "zustand";
import axios from "axios";

interface User {
  username: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  location: string | null;
  login: (username: string, password: string, location: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  location: null,

  login: async (username, password, location) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/login", {
        username,
        password,
        store_code: location,
        headers:{
          'ngrok-skip-browser-warning': 'true'
        }
      });

      const userData = response.data;

      set({ user: userData, isAuthenticated: true, location });

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", username);
      localStorage.setItem("location", location);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.detail || "Invalid credentials"
      );
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, location: null });
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("location");
  },
}));
