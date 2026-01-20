import { useState, useEffect, useRef } from "react";
import { MdDateRange } from "react-icons/md";
import { FaDownload, FaFolderOpen } from "react-icons/fa";
import { GiKnifeFork } from "react-icons/gi";
import { FaGlassCheers, FaBoxOpen } from "react-icons/fa";

// Types
interface RawDataRecord {
  Date: string;
  Timestamp: string;
  Total_Food: number;
  Total_Drinks: number;
  Total_Parcels: number;
  Video_Path: string;
  DateTime: string;
}

interface RawDataResponse {
  start_date: string;
  end_date: string;
  total_records: number;
  data: RawDataRecord[];
  timestamp?: string;
}

// WebSocket Base URL
const WS_BASE_URL = "ws://127.0.0.1:8000";
const API_BASE_URL = "http://127.0.0.1:8000";

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

const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <div className="mb-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
};

// ================== MAIN RECORDS COMPONENT ==================
const Records = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(today.getDate() - 1);
    return yesterdayDate.toISOString().split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState<RawDataResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date!");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setConnectionStatus("connecting");

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Connect to raw data WebSocket
    const ws = new WebSocket(`${WS_BASE_URL}/ws/raw-data`);

    ws.onopen = () => {
      console.log("Raw Data WebSocket connected");
      setConnectionStatus("connected");

      // Send date range parameters
      ws.send(
        JSON.stringify({
          start_date: startDate,
          end_date: endDate,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Raw data received:", data);

        if (data.error) {
          console.error("WebSocket error:", data.error);
          alert(`Error: ${data.error}`);
          ws.close();
          return;
        }

        setRawData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error parsing data:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("disconnected");
      setIsLoading(false);
      alert("Failed to connect to WebSocket. Please check if the API is running.");
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setConnectionStatus("disconnected");
    };

    wsRef.current = ws;
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnectionStatus("disconnected");
      setHasSearched(false);
      setRawData(null);
    }
  };

  // Open folder location
  const openFolderLocation = async (videoPath: string) => {
    try {
      // Normalize path for backend: replace backslashes and safely encode
      const normalizedPath = videoPath.replace(/\\/g, "/");
      const encodedPath = normalizedPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      const response = await fetch(
        `${API_BASE_URL}/video/open-folder/${encodedPath}`
      );

      // const result = await response.json();

      // if (response.ok && result.success) {
      //   // Show success message
      //   alert(`✅ Folder opened successfully!\n\nPath: ${result.full_path}`);
      // } else {
      //   alert(`❌ Failed to open folder: ${result.detail || "Unknown error"}`);
      // }
    } catch (error) {
      console.error("Error opening folder:", error);
      alert(
        "❌ Failed to open folder. Please ensure:\n" +
          "1. The backend server is running\n" +
          "2. The video file exists\n" +
          "3. You have permission to access the folder"
      );
    }
  };

  // Auto-connect on mount with default (last 24 hours)
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate totals
  const calculateTotals = () => {
    if (!rawData || !rawData.data || rawData.data.length === 0) {
      return { totalFood: 0, totalDrinks: 0, totalParcels: 0 };
    }

    const totalFood = rawData.data.reduce(
      (sum, record) => sum + record.Total_Food,
      0
    );
    const totalDrinks = rawData.data.reduce(
      (sum, record) => sum + record.Total_Drinks,
      0
    );
    const totalParcels = rawData.data.reduce(
      (sum, record) => sum + record.Total_Parcels,
      0
    );

    return { totalFood, totalDrinks, totalParcels };
  };

  const totals = calculateTotals();

  // Download CSV function
  const downloadCSV = () => {
    if (!rawData || !rawData.data) return;

    const headers = ["Date", "Time", "Food", "Drinks", "Parcels", "Video Path"];
    const rows = rawData.data.map((item) => [
      item.Date,
      item.Timestamp,
      item.Total_Food,
      item.Total_Drinks,
      item.Total_Parcels,
      item.Video_Path,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `records_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-screen p-4">
      <Header
        title="Records (Real-time)"
        subtitle="View detailed records with live updates every 5 seconds"
      />

      {/* Connection Status */}
      <div
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm mb-4 ${
          connectionStatus === "connected"
            ? "bg-green-100 text-green-700"
            : connectionStatus === "connecting"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            connectionStatus === "connected"
              ? "bg-green-500 animate-pulse"
              : connectionStatus === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : "bg-red-500"
          }`}
        ></div>
        {connectionStatus === "connected"
          ? "Connected - Receiving real-time updates"
          : connectionStatus === "connecting"
          ? "Connecting..."
          : "Disconnected"}
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-4">
        <h3 className="text-lg font-semibold mb-4">📅 Select Date Range</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
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
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={connectWebSocket}
              disabled={isLoading}
              className="w-full bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading
                ? "Connecting..."
                : connectionStatus === "connected"
                ? "🔁 Reconnect & Fetch"
                : "🔍 Connect & Fetch"}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={disconnectWebSocket}
              disabled={connectionStatus === "disconnected"}
              className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              🔌 Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Show initial message if not searched yet */}
      {!hasSearched && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            👆 Select a date range and click 'Connect & Fetch' to view real-time
            records.
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
      {!isLoading && rawData && hasSearched && (
        <>
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              ✅ Data loaded successfully! Showing {rawData.total_records} records
              from {rawData.start_date} to {rawData.end_date}
              {rawData.timestamp && (
                <span className="ml-3">
                  <strong>Last Update:</strong> {rawData.timestamp}
                </span>
              )}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Card
              title="Total Records"
              value={rawData.total_records}
              icon={<MdDateRange className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Total Food"
              value={totals.totalFood}
              icon={<GiKnifeFork className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Total Drinks"
              value={totals.totalDrinks}
              icon={<FaGlassCheers className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Total Parcels"
              value={totals.totalParcels}
              icon={<FaBoxOpen className="text-xl text-[#FF4C4C]" />}
            />
          </div>

          {/* Records Table */}
          {rawData.data && rawData.data.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📋 Detailed Records</h3>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                >
                  <FaDownload /> Download CSV
                </button>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Food
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Drinks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parcels
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Video Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rawData.data.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.Date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.Timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.Total_Food}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.Total_Drinks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.Total_Parcels}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {record.Video_Path ? (
                            <button
                              onClick={() => openFolderLocation(record.Video_Path)}
                              className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                              <FaFolderOpen className="text-lg" />
                              Open Location
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">No video</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Data Message */}
          {(!rawData.data || rawData.data.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">
                No records available for the selected date range.
              </p>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-6 pb-4">
        Records Dashboard | Powered by FastAPI WebSockets & React | Real-time
        Updates
      </div>
    </div>
  );
};

export default Records;