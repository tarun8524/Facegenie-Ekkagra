import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin } from "@vis.gl/react-google-maps";
import { useState, useMemo, useEffect, useRef } from "react";
import { locationData } from "./locationData";

// Custom Dropdown Component with Red Hover
const CustomDropdown = ({ value, onChange, options, disabled, placeholder, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-2 py-1.5 text-sm text-left border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition bg-white flex items-center justify-between"
      >
        <span className={!value ? "text-gray-500" : "text-gray-900"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option, index) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseLeave={() => setHighlightedIndex(-1)}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                highlightedIndex === index 
                  ? 'bg-red-100 text-red-900' 
                  : value === option.value 
                  ? 'bg-red-50 text-red-800' 
                  : 'text-gray-900 hover:bg-red-50'
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MapProvider = () => {
  const googleMapApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY";

  const [selectedZone, setSelectedZone] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [hoveredMarker, setHoveredMarker] = useState(null);
  
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);

  // Reset dependent selections when parent changes
  useEffect(() => {
    localStorage.setItem('selectedZone', selectedZone);
    const event = new Event('locationChange');
    window.dispatchEvent(event);
    setSelectedState("");
    setSelectedCity("");
    setSelectedStore("");
  }, [selectedZone]);

  useEffect(() => {
    localStorage.setItem('selectedState', selectedState);
    const event = new Event('locationChange');
    window.dispatchEvent(event);
    setSelectedCity("");
    setSelectedStore("");
  }, [selectedState]);

  useEffect(() => {
    localStorage.setItem('selectedCity', selectedCity);
    const event = new Event('locationChange');
    window.dispatchEvent(event);
    setSelectedStore("");
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem('selectedStore', selectedStore);
    const event = new Event('locationChange');
    window.dispatchEvent(event);
  }, [selectedStore]);

  // Update map based on selections
  useEffect(() => {
    if (selectedStore && selectedCity && selectedState && selectedZone) {
      const store = locationData[selectedZone]?.states[selectedState]?.cities[selectedCity]?.stores.find(s => s.id === selectedStore);
      if (store) {
        setMapCenter({ lat: store.lat, lng: store.lng });
        setMapZoom(16);
      }
    } else if (selectedCity && selectedState && selectedZone) {
      const city = locationData[selectedZone]?.states[selectedState]?.cities[selectedCity];
      if (city) {
        setMapCenter(city.center);
        setMapZoom(city.zoom);
      }
    } else if (selectedState && selectedZone) {
      const state = locationData[selectedZone]?.states[selectedState];
      if (state) {
        setMapCenter(state.center);
        setMapZoom(state.zoom);
      }
    } else if (selectedZone) {
      const zone = locationData[selectedZone];
      if (zone) {
        setMapCenter(zone.center);
        setMapZoom(zone.zoom);
      }
    } else {
      setMapCenter({ lat: 20.5937, lng: 78.9629 });
      setMapZoom(5);
    }
  }, [selectedZone, selectedState, selectedCity, selectedStore]);

  const availableStates = selectedZone ? Object.keys(locationData[selectedZone]?.states || {}) : [];
  const availableCities = selectedZone && selectedState 
    ? Object.keys(locationData[selectedZone]?.states[selectedState]?.cities || {}) 
    : [];
  const availableStores = selectedZone && selectedState && selectedCity
    ? locationData[selectedZone]?.states[selectedState]?.cities[selectedCity]?.stores || []
    : [];

  // Prepare options for custom dropdowns
  const zoneOptions = [
    { value: "", label: "-- Select Zone --" },
    ...Object.keys(locationData).map(zone => ({ value: zone, label: zone }))
  ];

  const stateOptions = [
    { value: "", label: "-- Select State --" },
    ...availableStates.map(state => ({ value: state, label: state }))
  ];

  const cityOptions = [
    { value: "", label: "-- Select City --" },
    ...availableCities.map(city => ({ value: city, label: city }))
  ];

  const storeOptions = [
    { value: "", label: "-- Select Store --" },
    ...availableStores.map(store => ({ value: store.id, label: store.name }))
  ];

  // Get all markers based on current selection level
  const markers = useMemo(() => {
    const allMarkers = [];

    // If specific city is selected, show only that city's stores
    if (selectedZone && selectedState && selectedCity) {
      const stores = locationData[selectedZone]?.states[selectedState]?.cities[selectedCity]?.stores || [];
      stores.forEach((store) => {
        allMarkers.push(
          <AdvancedMarker
            key={store.id}
            position={{ lat: store.lat, lng: store.lng }}
            title={store.name}
            onMouseEnter={() => setHoveredMarker(store)}
            onMouseLeave={() => setHoveredMarker(null)}
          >
            <Pin background={selectedStore === store.id ? "#3b82f6" : "#ef4444"} borderColor="#fff" glyphColor="#fff" />
          </AdvancedMarker>
        );
      });
    }
    // If state is selected but not city, show all stores in that state
    else if (selectedZone && selectedState) {
      const cities = locationData[selectedZone]?.states[selectedState]?.cities || {};
      Object.values(cities).forEach((city) => {
        city.stores.forEach((store) => {
          allMarkers.push(
            <AdvancedMarker
              key={store.id}
              position={{ lat: store.lat, lng: store.lng }}
              title={store.name}
              onMouseEnter={() => setHoveredMarker(store)}
              onMouseLeave={() => setHoveredMarker(null)}
            >
              <Pin background="#ef4444" borderColor="#fff" glyphColor="#fff" />
            </AdvancedMarker>
          );
        });
      });
    }
    // If zone is selected but not state, show all stores in that zone
    else if (selectedZone) {
      const states = locationData[selectedZone]?.states || {};
      Object.values(states).forEach((state) => {
        Object.values(state.cities).forEach((city) => {
          city.stores.forEach((store) => {
            allMarkers.push(
              <AdvancedMarker
                key={store.id}
                position={{ lat: store.lat, lng: store.lng }}
                title={store.name}
                onMouseEnter={() => setHoveredMarker(store)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                <Pin background="#ef4444" borderColor="#fff" glyphColor="#fff" />
              </AdvancedMarker>
            );
          });
        });
      });
    }
    // If nothing is selected, show all stores from all zones
    else {
      Object.values(locationData).forEach((zone) => {
        Object.values(zone.states).forEach((state) => {
          Object.values(state.cities).forEach((city) => {
            city.stores.forEach((store) => {
              allMarkers.push(
                <AdvancedMarker
                  key={store.id}
                  position={{ lat: store.lat, lng: store.lng }}
                  title={store.name}
                  onMouseEnter={() => setHoveredMarker(store)}
                  onMouseLeave={() => setHoveredMarker(null)}
                >
                  <Pin background="#ef4444" borderColor="#fff" glyphColor="#fff" />
                </AdvancedMarker>
              );
            });
          });
        });
      });
    }

    return allMarkers;
  }, [selectedZone, selectedState, selectedCity, selectedStore]);

  return (
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Location Selection Card - Top */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Zone Card */}
          <div className="bg-white rounded-lg shadow-md border border-red-400 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <label className="text-xs font-semibold text-gray-700">Zone</label>
            </div>
            <CustomDropdown
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              options={zoneOptions}
              disabled={false}
              placeholder="-- Select Zone --"
            />
          </div>

          {/* State Card */}
          <div className="bg-white rounded-lg shadow-md border border-red-400 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <label className="text-xs font-semibold text-gray-700">State</label>
            </div>
            <CustomDropdown
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              options={stateOptions}
              disabled={!selectedZone}
              placeholder="-- Select State --"
            />
          </div>

          {/* City Card */}
          <div className="bg-white rounded-lg shadow-md border border-red-400 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
              </svg>
              <label className="text-xs font-semibold text-gray-700">City</label>
            </div>
            <CustomDropdown
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              options={cityOptions}
              disabled={!selectedState}
              placeholder="-- Select City --"
            />
          </div>

          {/* Store Card */}
          <div className="bg-white rounded-lg shadow-md border border-red-400 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <label className="text-xs font-semibold text-gray-700">Store</label>
            </div>
            <CustomDropdown
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              options={storeOptions}
              disabled={!selectedCity}
              placeholder="-- Select Store --"
            />
          </div>
        </div>

        {/* Map - Full Width, No Card */}
        <div className="rounded-lg overflow-hidden shadow-lg">
          <APIProvider apiKey={googleMapApiKey}>
            <Map
              mapId="b563f088d8ab751a"
              className="h-[540px] rounded-lg"
              zoom={mapZoom}
              center={mapCenter}
            >
              {markers}
              {hoveredMarker && (
                <InfoWindow
                  position={{ lat: hoveredMarker.lat, lng: hoveredMarker.lng }}
                  onCloseClick={() => setHoveredMarker(null)}
                >
                  <div className="p-2 text-sm max-w-xs">
                    <h3 className="font-semibold text-blue-700">{hoveredMarker.name}</h3>
                    <p className="text-gray-600">
                      Lat: {hoveredMarker.lat.toFixed(4)}
                    </p>
                    <p className="text-gray-600">
                      Long: {hoveredMarker.lng.toFixed(4)}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>
      </div>
  );
};

export default MapProvider;