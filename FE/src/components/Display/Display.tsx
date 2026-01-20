import { useState, useEffect, useRef } from "react";
import { MdDateRange, MdClose } from "react-icons/md";
import { FaDownload, FaImage } from "react-icons/fa";
import { GiKnifeFork } from "react-icons/gi";

// Types
interface FoodDataRecord {
  Date: string;
  Time: string;
  Food_Count: number;
  Frame_name: string;
  DateTime: string;
}

interface FoodDataResponse {
  start_date: string;
  end_date: string;
  total_records: number;
  data: FoodDataRecord[];
  timestamp?: string;
}

// WebSocket Base URL
const WS_BASE_URL = "ws://127.0.0.1:8000";
const API_BASE_URL = "http://127.0.0.1:8000";

// Components
const Card = ({ title, value, icon, layout }: any) => {
  if (layout === 'split') {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm mb-2">Date</p>
                <h3 className="text-2xl font-bold">{value.date}</h3>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2">Time</p>
                <h3 className="text-2xl font-bold">{value.time}</h3>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-full">{icon}</div>
        </div>
      </div>
    );
  }

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

// Image Modal Component
const ImageModal = ({ 
  frameName, 
  onClose 
}: { 
  frameName: string; 
  onClose: () => void;
}) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New states for zoom & pan
  const [zoom, setZoom] = useState<number>(1); // 1 = fit
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const startPanRef = useRef<{ x: number; y: number } | null>(null);
  const lastTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/food-frame/${frameName}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          const imageSrc = `data:${data.content_type};base64,${data.image_base64}`;
          setImageData(imageSrc);
          // reset transform on new image
          setZoom(1);
          setTranslate({ x: 0, y: 0 });
          lastTranslateRef.current = { x: 0, y: 0 };
        }
      } catch (err) {
        setError('Failed to load image');
        console.error('Error fetching image:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (frameName) {
      fetchImage();
    }
  }, [frameName]);

  // helpers
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const zoomStep = 0.25;
  const minZoom = 1;
  const maxZoom = 5;

  const handleZoom = (delta: number) => {
    setZoom((z) => {
      const next = clamp(parseFloat((z + delta).toFixed(2)), minZoom, maxZoom);
      // if zoom reset to <=1, also reset translation
      if (next <= 1) {
        setTranslate({ x: 0, y: 0 });
        lastTranslateRef.current = { x: 0, y: 0 };
      }
      return next;
    });
  };

  const resetZoom = () => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
    lastTranslateRef.current = { x: 0, y: 0 };
  };

  // Pan handlers (mouse)
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    isPanningRef.current = true;
    startPanRef.current = { x: e.clientX, y: e.clientY };
    // ensure lastTranslateRef has latest
    lastTranslateRef.current = { ...lastTranslateRef.current };
    (e.target as Element).closest && (document.body.style.cursor = 'grabbing');
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !startPanRef.current) return;
      const dx = e.clientX - startPanRef.current.x;
      const dy = e.clientY - startPanRef.current.y;
      const nextX = lastTranslateRef.current.x + dx;
      const nextY = lastTranslateRef.current.y + dy;
      setTranslate({ x: nextX, y: nextY });
    };

    const onUp = () => {
      if (!isPanningRef.current) return;
      // commit last translate
      lastTranslateRef.current = { ...translate };
      isPanningRef.current = false;
      startPanRef.current = null;
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate, zoom]);

  // Touch pan
  const onTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1) return;
    const t = e.touches[0];
    isPanningRef.current = true;
    startPanRef.current = { x: t.clientX, y: t.clientY };
    lastTranslateRef.current = { ...lastTranslateRef.current };
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isPanningRef.current || !startPanRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startPanRef.current.x;
      const dy = t.clientY - startPanRef.current.y;
      const nextX = lastTranslateRef.current.x + dx;
      const nextY = lastTranslateRef.current.y + dy;
      setTranslate({ x: nextX, y: nextY });
    };

    const onTouchEnd = () => {
      if (!isPanningRef.current) return;
      lastTranslateRef.current = { ...translate };
      isPanningRef.current = false;
      startPanRef.current = null;
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate, zoom]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaImage className="text-xl" />
            <h3 className="text-lg font-semibold">Frame Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Floating zoom controls - kept in header area visually but positioned inside modal */}
            <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-full p-1">
              <button
                onClick={() => handleZoom(-zoomStep)}
                title="Zoom Out"
                className="text-black px-3 py-1 rounded hover:bg-white/10 transition"
              >−</button>
              <div className="text-sm font-medium px-2 text-black">{Math.round(zoom * 100)}%</div>
              <button
                onClick={() => handleZoom(zoomStep)}
                title="Zoom In"
                className="text-black px-3 py-1 rounded hover:bg-white/10 transition"
              >+</button>
            </div>

            <button
              onClick={onClose}
              className="hover:bg-red-700 rounded-full p-2 transition-colors"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Frame Name:</p>
            <p className="text-lg font-semibold text-gray-800 break-all">{frameName}</p>
          </div>

          {/* Image Display */}
          <div 
            className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px] overflow-hidden relative"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            // prevent default gesture behavior when touch-dragging
            onTouchMove={(e) => { if (zoom > 1) e.preventDefault(); }}
          >
            {/* Floating controls inside the image area (right side) */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-2 bg-white/80 backdrop-blur rounded-lg p-2 shadow">
              <button
                onClick={() => handleZoom(zoomStep)}
                className="w-10 h-10 flex items-center justify-center bg-white rounded hover:bg-gray-100 shadow text-lg"
                aria-label="Zoom in"
                title="Zoom in (+)"
              >+</button>
              <button
                onClick={() => handleZoom(-zoomStep)}
                className="w-10 h-10 flex items-center justify-center bg-white rounded hover:bg-gray-100 shadow text-lg"
                aria-label="Zoom out"
                title="Zoom out (−)"
              >−</button>
              <button
                onClick={resetZoom}
                className="w-10 h-10 flex items-center justify-center bg-white rounded hover:bg-gray-100 shadow text-sm font-medium"
                aria-label="Reset zoom"
                title="Reset"
              >Reset</button>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-500"></div>
                <p className="text-gray-600">Loading image...</p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <div className="text-red-500 text-5xl mb-3">⚠️</div>
                <p className="text-red-600 font-semibold">{error}</p>
              </div>
            )}

            {!isLoading && !error && imageData && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={imageData} 
                  alt={frameName}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  // combined transform for pan & zoom
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
                    transition: isPanningRef.current ? 'none' : 'transform 120ms ease-out',
                    cursor: zoom > 1 ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  className="rounded-lg shadow-lg"
                />
                {/* optionally show hint */}
                {zoom > 1 && (
                  <div className="absolute left-4 bottom-4 bg-black/50 text-white text-xs px-3 py-1 rounded">
                    Drag to move
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Display Component
const Display = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(today.getDate() - 1);
    return yesterdayDate.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState<FoodDataResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date!");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setConnectionStatus('connecting');

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Connect to food data WebSocket
    const ws = new WebSocket(`${WS_BASE_URL}/ws/food-data`);
    
    ws.onopen = () => {
      console.log('Food Data WebSocket connected');
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
        console.log('Food data received:', data);
        
        if (data.error) {
          console.error('WebSocket error:', data.error);
          alert(`Error: ${data.error}`);
          ws.close();
          return;
        }
        
        setFoodData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing data:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
      setIsLoading(false);
      alert('Failed to connect to WebSocket. Please check if the API is running.');
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
      setConnectionStatus('disconnected');
      setHasSearched(false);
      setFoodData(null);
    }
  };

  // Auto-connect on mount with default (last 24 hours)
  useEffect(() => {
    // Auto-connect immediately (last 24 hours defaults from startDate/endDate)
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Get last record data
  const getLastRecordData = () => {
    if (!foodData || !foodData.data || foodData.data.length === 0) {
      return { lastDate: 'N/A', lastCount: 0 };
    }

    const lastRecord = foodData.data[foodData.data.length - 1];
    const lastDate = `${lastRecord.Date} ${lastRecord.Time}`;
    const lastCount = lastRecord.Food_Count;

    return { lastDate, lastCount };
  };

  const lastRecordData = getLastRecordData();

  // Download CSV function
  const downloadCSV = () => {
    if (!foodData || !foodData.data) return;

    const headers = ['Date', 'Time', 'Food Count', 'Frame Name'];
    const rows = foodData.data.map(item => [
      item.Date,
      item.Time,
      item.Food_Count,
      item.Frame_name
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food_count_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-screen p-4">
      <Header 
        title="Food Count Display (Real-time)"
        subtitle="View food count history with live updates every 5 seconds"
      />

      {/* Connection Status */}
      <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm mb-4 ${
        connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
        connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
        'bg-red-100 text-red-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
          connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500'
        }`}></div>
        {connectionStatus === 'connected' ? 'Connected - Receiving real-time updates' :
         connectionStatus === 'connecting' ? 'Connecting...' :
         'Disconnected'}
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
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              // always allow changing start date
              disabled={false}
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
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              // always allow changing end date
              disabled={false}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={connectWebSocket}
              // allow reconnect/fetch even when already connected; only block during active connect
              disabled={isLoading}
              className="w-full bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? "Connecting..." : (connectionStatus === 'connected' ? "🔁 Reconnect & Fetch" : "🔍 Connect & Fetch")}
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
      </div>

      {/* Show initial message if not searched yet */}
      {!hasSearched && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            👆 Select a date range and click 'Connect & Fetch' to view real-time food count records.
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
      {!isLoading && foodData && hasSearched && (
        <>
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              ✅ Data loaded successfully! Showing {foodData.total_records} records from {foodData.start_date} to {foodData.end_date}
              {foodData.timestamp && <span className="ml-3"><strong>Last Update:</strong> {foodData.timestamp}</span>}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card
              title="Last Record"
              value={{ date: lastRecordData.lastDate.split(' ')[0], time: lastRecordData.lastDate.split(' ')[1] }}
              layout="split"
              icon={<MdDateRange className="text-xl text-[#FF4C4C]" />}
            />
            <Card
              title="Last Food Count"
              value={lastRecordData.lastCount}
              icon={<GiKnifeFork className="text-xl text-[#FF4C4C]" />}
            />
          </div>

          {/* Records Table */}
          {foodData.data && foodData.data.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📋 Food Count Records</h3>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frame</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {foodData.data.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.Date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.Time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.Food_Count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {record.Frame_name ? (
                            <button
                              onClick={() => setSelectedFrame(record.Frame_name)}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              <FaImage className="text-lg" />
                              <span className="max-w-[200px] truncate">
                                {record.Frame_name}
                              </span>
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">No frame</span>
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
          {(!foodData.data || foodData.data.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">
                No food count records available for the selected date range.
              </p>
            </div>
          )}
        </>
      )}

      {/* Image Modal */}
      {selectedFrame && (
        <ImageModal 
          frameName={selectedFrame}
          onClose={() => setSelectedFrame(null)}
        />
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-6 pb-4">
        Food Count Display | Powered by FastAPI WebSockets & React | Real-time Updates
      </div>
    </div>
  );
};

export default Display;