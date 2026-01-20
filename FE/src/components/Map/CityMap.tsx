import Header from "../Header"
import { Card } from "../ui/card";
import MapProvider from "./MapProvider";
// ...existing code...
const CityMap = () => {
  return (
    <div className="w-full">
      <div>
        <Header title={"City Map"} showManager />
        <p className="-mt-3 mb-4 text-m text-black-600">Choose your zone, state, city, and store to explore data</p>
      </div>
      <MapProvider />
    </div>
  )
}

export default CityMap
// ...existing code...