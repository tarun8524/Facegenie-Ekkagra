import { create } from "zustand";
import axios from "axios";

interface RegisterState {
  register: (
    username: string,
    password: string,
    confirmPassword: string,
    locations: string[]
  ) => Promise<void>;
}

export const useRegisterStore = create<RegisterState>(() => ({
  register: async (username, password, confirmPassword, locations) => {
    if (!username || !password || !confirmPassword || locations.length === 0) {
      throw new Error("All fields are required");
    }
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/register", {
        username,
        password,
        store_code: locations,
      });

      console.log("Registered:", response.data);
    } catch (err: any) {
      console.error("Register error:", err);
      throw new Error(err.response?.data?.message || "Registration failed");
    }
  },
}));
