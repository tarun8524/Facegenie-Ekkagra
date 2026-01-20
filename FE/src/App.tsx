import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import CityMap from "./components/Map/CityMap";

import { Toaster } from "sonner";
// Analytics Components
import DashBoard from "./components/Dashboard/DashBoard";
import Login from "./pages/Login";
import PrivateRoute from "./pages/PrivateRoute";
import Register from "./pages/Register";
import Insights from "./components/Insights/Insights";
import Records from "./components/Records/Records";
import Display from "./components/Display/Display";

function App() {
  return (
    <>
      <Routes>
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Home />}>
            <Route index element={<CityMap />} />
            <Route path="dashboard" element={<DashBoard />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/records" element={<Records />} />
            <Route path="/display" element={<Display />} />
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <Toaster richColors position={"top-right"} />
    </>
  );
}

export default App;