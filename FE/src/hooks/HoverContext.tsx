import { createContext, useState, useContext, ReactNode } from 'react';

export interface RawDataPoint {
  camera_name: string;
  customer_count: number;
}

interface HoverContextType {
  hoveredData: RawDataPoint;
  setHoveredData: (data: RawDataPoint) => void;
}

// Default values
const defaultValue: HoverContextType = {
  hoveredData: { camera_name: 'Hover over a cell', customer_count: 0 },
  setHoveredData: () => { },
};

const HoverContext = createContext<HoverContextType>(defaultValue);

export const useHoverContext = () => useContext(HoverContext);

export const HoverProvider = ({ children }: { children: ReactNode }) => {
  const [hoveredData, setHoveredData] = useState<RawDataPoint>(defaultValue.hoveredData);

  return (
    <HoverContext.Provider value={{ hoveredData, setHoveredData }}>
      {children}
    </HoverContext.Provider>
  );
};
