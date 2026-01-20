import { useState } from 'react';
import facegenie_logo from "../assets/facegenie_logo.png"
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      // Static credential check
      if (username === 'admin@123' && password === 'password') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        toast.success("Login Successful");
        window.location.href = '/';
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white shadow-xl rounded-xl p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={facegenie_logo} alt="ResoluteAI Software" className="h-16" />
        </div>
        <h2 className="text-2xl font-semibold text-center mb-1">Welcome Back</h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Please sign in to your account
        </p>
        <form onSubmit={handleSubmit}>
          <Label className="block mb-2 text-sm font-medium text-gray-700">Username</Label>
          <Input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Label className="block mt-4 mb-2 text-sm font-medium text-gray-700">Password</Label>
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full bg-red-500 text-white rounded-md mt-6 hover:bg-red-600 transition"
          >
            Sign In
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Demo credentials: <strong>admin@123 / password</strong>
        </p>
      </div>
    </div>
  );
};

export default Login;
