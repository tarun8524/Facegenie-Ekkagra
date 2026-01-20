import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { SidebarProvider } from "./ui/sidebar";

const Home = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#FFF0EE]">
        <div className="hidden md:block w-[270px]">
          <AppSidebar />
        </div>
        <div className="flex-1 w-full md:w-[calc(100%-270px)] p-4">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Home;
