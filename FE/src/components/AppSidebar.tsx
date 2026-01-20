import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { LuMapPinned, LuUsers } from "react-icons/lu";
import { FaRegChartBar } from "react-icons/fa";
import { IoCameraOutline } from "react-icons/io5";
import { MdOutlineDashboard, MdOutlineFeedback } from "react-icons/md";
import { AiOutlineClockCircle, AiOutlineSafetyCertificate } from "react-icons/ai";
import { RiMapPin2Line, RiStore2Line } from "react-icons/ri";
import { GiModernCity } from "react-icons/gi";
import { HiOutlineGlobeAlt } from "react-icons/hi";

import facegenie_logo from "../assets/facegenie_logo.png";
import resoluteai_logo from "../assets/resoluteai_logo.webp";

import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const sidebarMenu = [
  { id: 1, name: "City Map", icon: <LuMapPinned />, path: "/" },
  // { id: 2, name: "User Management", icon: <LuUsers />, path: "/user-management" },
  { id: 3, name: "Dashboard", icon: <MdOutlineDashboard />, path: "/dashboard" },
  { id: 4, name: "Insights", icon: <FaRegChartBar />, path: "/Insights" },
  { id: 5, name: "Records", icon: <AiOutlineClockCircle />, path: "/records" },
  { id: 6, name: "Display", icon: <AiOutlineSafetyCertificate />, path: "/display" },
  // { id: 7, name: "Feedback", icon: <MdOutlineFeedback />, path: "/feedback" },
  // { id: 8, name: "Camera Management", icon: <IoCameraOutline />, path: "/camera-management" }
];

const AppSidebar = () => {
  const location = useLocation();
  const [selectedLocation, setSelectedLocation] = useState({
    zone: localStorage.getItem('selectedZone') || '',
    state: localStorage.getItem('selectedState') || '',
    city: localStorage.getItem('selectedCity') || '',
    store: localStorage.getItem('selectedStore') || ''
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setSelectedLocation({
        zone: localStorage.getItem('selectedZone') || '',
        state: localStorage.getItem('selectedState') || '',
        city: localStorage.getItem('selectedCity') || '',
        store: localStorage.getItem('selectedStore') || ''
      });
    };

    window.addEventListener('locationChange', handleLocationChange);
    return () => window.removeEventListener('locationChange', handleLocationChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  return (
    <Sidebar className="p-4 m-4 rounded-2xl bg-white shadow-[0_0_20px_rgba(0,0,0,0.1)]">
      {/* Logo Header */}
      <SidebarHeader className="flex justify-center items-center mb-4">
        <img src={facegenie_logo} alt="FaceGenie Logo" className="w-40" />
      </SidebarHeader>

      {/* Menu */}
      <SidebarContent className="flex-1">
        <SidebarMenu>
          {sidebarMenu.map((menu) => {
            const isActive =
              menu.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(menu.path);

            return (
              <SidebarMenuItem key={menu.id}>
                <SidebarMenuButton asChild>
                  <Link
                    to={menu.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "text-[#F92609] font-semibold bg-red-100"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {menu.icon}
                    <span>{menu.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="flex flex-col items-center">
        {selectedLocation.store && (
          <div className="w-full p-3 mb-4 bg-red-50 rounded-lg text-sm text-gray-700">
            <h3 className="font-semibold text-gray-800 mb-2 text-center">📍 Location</h3>
            <div className="space-y-1">
              {selectedLocation.zone && (
                <p className="flex items-center gap-2"><HiOutlineGlobeAlt className="text-red-500" size={16}/> <span>Z: {selectedLocation.zone}</span></p>
              )}
              {selectedLocation.state && (
                <p className="flex items-center gap-2"><RiMapPin2Line className="text-red-500" size={16}/> <span>S: {selectedLocation.state}</span></p>
              )}
              {selectedLocation.city && (
                <p className="flex items-center gap-2"><GiModernCity className="text-red-500" size={16}/> <span>C: {selectedLocation.city}</span></p>
              )}
              {selectedLocation.store && (
                <p className="flex items-center gap-2 font-medium text-gray-900"><RiStore2Line className="text-red-500" size={16}/> <span>{selectedLocation.store}</span></p>
              )}
            </div>
          </div>
        )}

        <button
          className="bg-red-100 w-24 text-black font-semibold px-4 py-2 mb-3 rounded-full shadow hover:bg-red-200 transition-all"
          onClick={handleLogout}
        >
          Logout
        </button>

        <h1 className="text-xl text-center font-semibold">Powered by</h1>
        <img src={resoluteai_logo} alt="Resolute AI Logo" className="w-40" />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
