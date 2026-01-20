import { useEffect, useState, useRef } from "react";
import { MdPeopleOutline, MdOutlineAccessTime } from "react-icons/md";
import { FaShoppingBag } from "react-icons/fa";
import { IoIosTrendingUp } from "react-icons/io";
import { GiKnifeFork } from "react-icons/gi";
import { FaGlassCheers, FaBoxOpen } from "react-icons/fa";
import { MdDateRange } from "react-icons/md";

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface TotalsData {
  total_food: number;
  total_drinks: number;
  total_parcels: number;
  start_time: string;
  end_time: string;
  period?: string;
  timestamp?: string;
}

interface DetailedDataPoint {
  timestamp: string;
  food_count: number;
  drinks_count: number;
  parcels_count: number;
}

interface DetailedData {
  data: DetailedDataPoint[];
  summary: {
    total_records?: number;
    total_hours?: number;
    total_days?: number;
    period_days?: number;
    total_intervals?: number;
    total_food?: number;
    total_drinks?: number;
    total_parcels?: number;
  };
  timestamp?: string;
}

// WebSocket Base URL
const WS_BASE_URL = "ws://127.0.0.1:8000";

// Color scheme
const COLORS = {
  food: '#FF4C4C',
  drinks: '#4FC3F7',
  parcels: '#FFD166'
};

// Components
const TimeSelection = ({ selectedTimeRange, setSelectedTimeRange }: any) => {
  const timeRanges = ["1hr", "24hr", "7d", "30d", "90d"];

  return (
    <div className="flex space-x-2 bg-white shadow-md rounded-lg border border-gray-300 p-2 w-full">
      {timeRanges.map(range => (
        <button
          key={range}
          className={`px-3 py-1 w-22 sm:w-14 text-sm sm:text-md rounded-full ${
            selectedTimeRange === range ? "bg-red-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setSelectedTimeRange(range)}
        >
          {range}
        </button>
      ))}
    </div>
  );
};

const Card = ({ title, value, change, icon }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {change && (
            <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
              {change}
            </p>
          )}
        </div>
        <div className="bg-red-50 p-3 rounded-full">{icon}</div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
};

const Header = ({ title, rightContent }: { title: string; rightContent?: React.ReactNode }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {rightContent}
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("24hr");
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Analytics data states
  const [totalsData, setTotalsData] = useState<TotalsData | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedData | null>(null);

  // WebSocket refs
  const totalsWsRef = useRef<WebSocket | null>(null);
  const detailedWsRef = useRef<WebSocket | null>(null);

  // Connect to WebSockets
  useEffect(() => {
    setIsLoading(true);
    setConnectionStatus('connecting');

    // Close existing connections
    if (totalsWsRef.current) {
      totalsWsRef.current.close();
    }
    if (detailedWsRef.current) {
      detailedWsRef.current.close();
    }

    // Connect to totals WebSocket
    const totalsWs = new WebSocket(`${WS_BASE_URL}/ws/totals/${selectedTimeRange}`);
    
    totalsWs.onopen = () => {
      console.log('Totals WebSocket connected');
      setConnectionStatus('connected');
    };

    totalsWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Totals data received:', data);
        
        if (data.error) {
          console.error('Totals error:', data.error);
          return;
        }
        
        setTotalsData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing totals data:', err);
      }
    };

    totalsWs.onerror = (error) => {
      console.error('Totals WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    totalsWs.onclose = () => {
      console.log('Totals WebSocket closed');
      setConnectionStatus('disconnected');
    };

    totalsWsRef.current = totalsWs;

    // Connect to detailed WebSocket
    const detailedWs = new WebSocket(`${WS_BASE_URL}/ws/detailed/${selectedTimeRange}`);
    
    detailedWs.onopen = () => {
      console.log('Detailed WebSocket connected');
    };

    detailedWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Detailed data received:', data);
        
        if (data.error) {
          console.error('Detailed error:', data.error);
          return;
        }
        
        setDetailedData(data);
      } catch (err) {
        console.error('Error parsing detailed data:', err);
      }
    };

    detailedWs.onerror = (error) => {
      console.error('Detailed WebSocket error:', error);
    };

    detailedWs.onclose = () => {
      console.log('Detailed WebSocket closed');
    };

    detailedWsRef.current = detailedWs;

    // Cleanup on unmount or when selectedTimeRange changes
    return () => {
      if (totalsWsRef.current) {
        totalsWsRef.current.close();
      }
      if (detailedWsRef.current) {
        detailedWsRef.current.close();
      }
    };
  }, [selectedTimeRange]);

  // Calculate totals
  const totalItems = totalsData 
    ? totalsData.total_food + totalsData.total_drinks + totalsData.total_parcels 
    : 0;

  // Prepare pie chart data
  const pieData = totalsData ? [
    { name: 'Food', value: totalsData.total_food },
    { name: 'Drinks', value: totalsData.total_drinks },
    { name: 'Parcels', value: totalsData.total_parcels }
  ] : [];

  const pieColors = [COLORS.food, COLORS.drinks, COLORS.parcels];

  return (
    <div className="w-full min-h-screen p-4">
      <div>
        <Header
          title="Analytics Dashboard (Real-time)"
          rightContent={
            <div className="hidden sm:flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
                connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                {connectionStatus}
              </div>
              <TimeSelection
                selectedTimeRange={selectedTimeRange}
                setSelectedTimeRange={setSelectedTimeRange}
              />
            </div>
          }
        />
        <p className="text-gray-600 mb-4">Real-time analytics for food, drinks, and parcels tracking (Updates every 5 seconds)</p>
      </div>
      
      <div className="flex sm:hidden my-2 flex-col gap-2">
        <div className={`flex items-center justify-center gap-2 px-3 py-1 rounded-full text-sm ${
          connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
          connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`}></div>
          {connectionStatus}
        </div>
        <TimeSelection
          selectedTimeRange={selectedTimeRange}
          setSelectedTimeRange={setSelectedTimeRange}
        />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Card
          title="Total Food"
          value={isLoading ? "..." : totalsData?.total_food ?? "0"}
          icon={<GiKnifeFork className="text-xl text-[#F92609]" />}
        />
        <Card
          title="Total Drinks"
          value={isLoading ? "..." : totalsData?.total_drinks ?? "0"}
          icon={<FaGlassCheers className="text-xl text-[#F92609]" />}
        />
        <Card
          title="Total Parcels"
          value={isLoading ? "..." : totalsData?.total_parcels ?? "0"}
          icon={<FaBoxOpen className="text-xl text-[#F92609]" />}
        />
        <Card
          title="Total Items"
          value={isLoading ? "..." : totalItems.toString()}
          icon={<MdDateRange className="text-xl text-[#F92609]" />}
        />
      </div>

      {/* Time Range Info */}
      {totalsData && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Period:</strong> {totalsData.start_time} to {totalsData.end_time}
            {totalsData.timestamp && <span className="ml-3"><strong>Last Update:</strong> {totalsData.timestamp}</span>}
          </p>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Pie Chart */}
        <ChartCard title="Distribution of Items">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="105%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Summary Statistics */}
        <ChartCard title="Summary Statistics">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-xs mb-1">Period</p>
                <p className="text-3xl font-bold text-purple-600">
                  {totalsData?.period ?? selectedTimeRange}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-xs mb-1">Total Items</p>
                <p className="text-3xl font-bold text-red-600">{totalItems}</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Quick Stats */}
        <ChartCard title="Quick Stats">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : detailedData && detailedData.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-xs mb-1">Avg Food</p>
                <p className="text-3xl font-bold text-red-600">
                  {(detailedData.data.reduce((sum, d) => sum + d.food_count, 0) / detailedData.data.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-xs mb-1">Avg Drinks</p>
                <p className="text-3xl font-bold text-teal-600">
                  {(detailedData.data.reduce((sum, d) => sum + d.drinks_count, 0) / detailedData.data.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-xs mb-1">Avg Parcels</p>
                <p className="text-3xl font-bold text-amber-600">
                  {(detailedData.data.reduce((sum, d) => sum + d.parcels_count, 0) / detailedData.data.length).toFixed(1)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-xs mb-1">Peak Items</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {Math.max(...detailedData.data.map(d => d.food_count + d.drinks_count + d.parcels_count))}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Bar Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <ChartCard title={`Item Distribution - ${selectedTimeRange.toUpperCase()}`}>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : detailedData && detailedData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={detailedData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="food_count" name="Food" fill={COLORS.food} />
                <Bar dataKey="drinks_count" name="Drinks" fill={COLORS.drinks} />
                <Bar dataKey="parcels_count" name="Parcels" fill={COLORS.parcels} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Line Chart */}
        <ChartCard title={`Trend Analysis - ${selectedTimeRange.toUpperCase()}`}>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : detailedData && detailedData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={detailedData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="food_count" 
                  name="Food" 
                  stroke={COLORS.food} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="drinks_count" 
                  name="Drinks" 
                  stroke={COLORS.drinks} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="parcels_count" 
                  name="Parcels" 
                  stroke={COLORS.parcels} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-6 pb-4">
        Analytics Dashboard | Powered by FastAPI WebSockets & React | Real-time Updates
      </div>
    </div>
  );
};

export default Dashboard;