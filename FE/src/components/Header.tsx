import { SidebarTrigger } from "./ui/sidebar";
import avatar_img from "../assets/profile-pic.jpg";
import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  rightContent?: ReactNode;
  showManager?: boolean; // <-- New prop
}

const Header = ({ title, rightContent, showManager = false }: HeaderProps) => {
  return (
    <div className="w-full px-1 flex justify-between items-center">
      <div className="flex items-center">
        <SidebarTrigger className="block md:hidden text-[#F92609] text-2xl" />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {rightContent && <div>{rightContent}</div>}

        {showManager && (
          <div className="hidden sm:flex items-center gap-3 p-2 border border-gray-200 shadow-md rounded-lg bg-white">
            <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center overflow-hidden">
              <img src={avatar_img} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="text-right">
              <p className="text-md font-semibold text-black">Shiva Kumar</p>
              <span className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full inline-block cursor-pointer">
                Manager
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
