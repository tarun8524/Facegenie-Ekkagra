import { useState } from "react";
import { ChevronDown } from "lucide-react";
import facegenie_logo from "../assets/facegenie_logo.png";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRegisterStore } from "../store/registerAuth";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const register = useRegisterStore((state) => state.register);

  const storeOptions = ["HYD", "BLR", "CHI"];

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await register(username, password, confirmPassword, locations);
      toast.success("Registration Successful");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setLocations([]);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    }
  };

  const toggleLocation = (loc: string) => {
    if (locations.includes(loc)) {
      setLocations((prev) => prev.filter((item) => item !== loc));
    } else {
      setLocations((prev) => [...prev, loc]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white shadow-xl rounded-xl p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img
            src={facegenie_logo}
            alt="ResoluteAI Software"
            className="h-16"
          />
        </div>
        <h2 className="text-2xl font-semibold text-center mb-1">
          Create Account
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Please fill in your details
        </p>

        <form onSubmit={handleSubmit}>
          <Label className="block mb-2 text-sm font-medium text-gray-700">
            Username
          </Label>
          <Input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Label className="block mt-4 mb-2 text-sm font-medium text-gray-700">
            Password
          </Label>
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Label className="block mt-4 mb-2 text-sm font-medium text-gray-700">
            Confirm Password
          </Label>
          <Input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Label className="block mt-4 mb-2 text-sm font-medium text-gray-700">
            Store Locations
          </Label>
          <div className="relative">
            {/* Input-like container with tags inside */}
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex flex-wrap items-center border rounded-md px-3 py-2 bg-gray-100 cursor-pointer min-h-[42px]"
            >
              {locations.length === 0 && (
                <span className="text-gray-400 text-sm">
                  Select store locations
                </span>
              )}
              {locations.map((loc) => (
                <div
                  key={loc}
                  className="flex items-center bg-white border border-red-500 text-black rounded-full px-3 py-1 text-sm mr-2 mb-1"
                >
                  {loc}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLocation(loc);
                    }}
                    className="ml-2 text-black hover:text-red-700 focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              <ChevronDown
                className={`ml-auto text-gray-500 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
                size={20}
              />
            </div>

            {dropdownOpen && (
              <div className="absolute w-full mt-1 bg-white border rounded shadow-lg z-10">
                {storeOptions.map((loc) => (
                  <label
                    key={loc}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={locations.includes(loc)}
                      onChange={() => toggleLocation(loc)}
                      className="mr-2"
                    />
                    {loc}
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-red-500 text-white rounded-md mt-6 hover:bg-red-600 transition"
          >
            Register
          </Button>
        </form>

        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-red-500 hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
};
export default Register;
