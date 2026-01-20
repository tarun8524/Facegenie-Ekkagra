import { useState, useEffect, useRef } from "react";
import { MdDateRange } from "react-icons/md";
import { FaDownload } from "react-icons/fa";
import { GiKnifeFork } from "react-icons/gi";
import { FaGlassCheers, FaBoxOpen } from "react-icons/fa";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface CustomRangeData {
  total_food: number;
  total_drinks: number;
  total_parcels: number;
  total_days: number;
  daily_breakdown: DailyBreakdown[];
  start_date: string;
  end_date: string;
  timestamp?: string;
}

interface DailyBreakdown {
  date: string;
  food_count: number;
  drinks_count: number;
  parcels_count: number;
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
const Card = ({ title, value, icon }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
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

const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <div className="mb-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
};

// Main Insights Component
const Insights = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    return tenDaysAgo.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [customData, setCustomData] = useState<CustomRangeData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date!");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setConnectionStatus('connecting');
    setError(null);

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Connect to custom range WebSocket
    const ws = new WebSocket(`${WS_BASE_URL}/ws/custom-range`);
    
    ws.onopen = () => {
      console.log('Custom Range WebSocket connected');
      setConnectionStatus('connected');
      
      // Send date range parameters
      ws.send(JSON.stringify({
        start_date: startDate,
        end_date: endDate
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Custom range data received:', data);
        
        if (data.error) {
          console.error('WebSocket error:', data.error);
          setError(`Error: ${data.error}`);
          ws.close();
          return;
        }
        
        setCustomData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing data:', err);
        setError('Failed to parse data from server');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
      setIsLoading(false);
      setError('Failed to connect to WebSocket. Please check if the API is running.');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setConnectionStatus('disconnected');
    };

    wsRef.current = ws;
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  const handleReconnect = () => {
    disconnectWebSocket();
    setTimeout(() => {
      connectWebSocket();
    }, 100);
  };

  // Cleanup on unmount
  useEffect(() => {
    // Auto-connect on mount to fetch the default last-10-days range
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    if (!customData || !customData.daily_breakdown || customData.daily_breakdown.length === 0) {
      return { avgFood: 0, avgDrinks: 0, avgParcels: 0, peakDay: 0 };
    }

    const totalDays = customData.daily_breakdown.length;
    const avgFood = customData.daily_breakdown.reduce((sum, d) => sum + d.food_count, 0) / totalDays;
    const avgDrinks = customData.daily_breakdown.reduce((sum, d) => sum + d.drinks_count, 0) / totalDays;
    const avgParcels = customData.daily_breakdown.reduce((sum, d) => sum + d.parcels_count, 0) / totalDays;
    const peakDay = Math.max(...customData.daily_breakdown.map(d => d.food_count + d.drinks_count + d.parcels_count));

    return { avgFood, avgDrinks, avgParcels, peakDay };
  };

  const stats = calculateStats();
  const totalItems = customData ? customData.total_food + customData.total_drinks + customData.total_parcels : 0;

  // Download CSV function
  const downloadCSV = () => {
    if (!customData || !customData.daily_breakdown) return;

    const headers = ['Date', 'Food', 'Drinks', 'Parcels', 'Total Items'];
    const rows = customData.daily_breakdown.map(item => [
      item.date,
      item.food_count,
      item.drinks_count,
      item.parcels_count,
      item.food_count + item.drinks_count + item.parcels_count
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-screen p-4">
      <Header 
        title="Insights & Custom Reports (Real-time)"
        subtitle="Analyze data across custom date ranges with live updates every 5 seconds"
      />

      {/* Connection Status */}
      <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm mb-4 ${
        connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
        connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
          connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          'bg-gray-500'
        }`}></div>
        {connectionStatus === 'connected' ? 'Connected - Receiving real-time updates' :
         connectionStatus === 'connecting' ? 'Connecting...' :
         'Disconnected - Select dates and click "Fetch Data"'}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-4">
        <h3 className="text-lg font-semibold mb-4">📅 Select Date Range</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError(null);
              }}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError(null);
              }}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={connectionStatus === 'disconnected' ? connectWebSocket : handleReconnect}
              disabled={isLoading}
              className="w-full bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? "Connecting..." : connectionStatus === 'connected' ? "🔄 Reconnect & Fetch" : "🔍 Fetch Data"}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={disconnectWebSocket}
              disabled={connectionStatus === 'disconnected'}
              className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              🔌 Disconnect
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>💡 <strong>Tip:</strong> Change the dates and click "Reconnect & Fetch" to load new data. The connection will automatically update every 5 seconds.</p>
        </div>
      </div>

      {/* Show initial message if not searched yet */}
      {!hasSearched && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            👆 Select a date range and click 'Fetch Data' to view real-time insights.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500"></div>
        </div>
      )}

      {/* Data Display */}
      {!isLoading && customData && hasSearched && (
        <>
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              ✅ Data loaded successfully! Showing data from {customData.start_date} to {customData.end_date}
              {customData.timestamp && <span className="ml-3"><strong>Last Update:</strong> {customData.timestamp}</span>}
            </p>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <Card
              title="Total Food"
              value={customData.total_food}
              icon={<GiKnifeFork className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Total Drinks"
              value={customData.total_drinks}
              icon={<FaGlassCheers className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Total Parcels"
              value={customData.total_parcels}
              icon={<FaBoxOpen className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Total Days"
              value={customData.total_days}
              icon={<MdDateRange className="text-xl text-[#FF4C4C]" />}
            />
          </div>

          {/* Charts and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Quick Stats */}
            <ChartCard title="Quick Statistics">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-xs mb-1">Avg Food/Day</p>
                  <p className="text-3xl font-bold text-red-600">{stats.avgFood.toFixed(1)}</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-xs mb-1">Avg Drinks/Day</p>
                  <p className="text-3xl font-bold text-teal-600">{stats.avgDrinks.toFixed(1)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-xs mb-1">Avg Parcels/Day</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.avgParcels.toFixed(1)}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-xs mb-1">Peak Day (Items)</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats.peakDay}</p>
                </div>
              </div>
            </ChartCard>

            {/* Summary Info */}
            <ChartCard title="Summary Overview">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Total Items</p>
                  <p className="text-4xl font-bold text-purple-600">{totalItems}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Date Range</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {customData.start_date} to {customData.end_date}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{customData.total_days} days</p>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Daily Breakdown Charts */}
          {customData.daily_breakdown && customData.daily_breakdown.length > 0 && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                {/* Pie Chart */}
                <ChartCard title="Total Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Food', value: customData.total_food },
                          { name: 'Drinks', value: customData.total_drinks },
                          { name: 'Parcels', value: customData.total_parcels }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        <Cell fill={COLORS.food} />
                        <Cell fill={COLORS.drinks} />
                        <Cell fill={COLORS.parcels} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Line Chart */}
                <ChartCard title="Daily Trends">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={customData.daily_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
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
                </ChartCard>
              </div>

              {/* Daily Breakdown Table */}
              <ChartCard title="📋 Daily Breakdown">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drinks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcels</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customData.daily_breakdown.map((item, index) => {
                        const totalItems = item.food_count + item.drinks_count + item.parcels_count;
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.food_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.drinks_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.parcels_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{totalItems}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Export Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    <FaDownload /> Download CSV
                  </button>
                </div>
              </ChartCard>
            </>
          )}

          {/* No Data Message */}
          {(!customData.daily_breakdown || customData.daily_breakdown.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">
                No data available for the selected date range.
              </p>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-6 pb-4">
        Analytics Dashboard | Powered by FastAPI WebSockets & React | Real-time Updates
      </div>
    </div>
  );
};

export default Insights;