import { create } from 'zustand';
import { toast } from 'sonner';

export interface Alert {
  id: string;
  type: 'intrusion' | 'fall' | 'tampering'; 
  originalAlertType: string;
  location: string;
  timestamp: string;
  timeElapsed?: string;
  status: 'active' | 'resolved';
  description: string;
  imageBase64?: string;
}

interface AlertState {
  alerts: Alert[];
  fetchAlerts: () => Promise<void>;
  respondAlert: (id: string) => Promise<void>;
}

let alertIdCounter = 1;

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],

  fetchAlerts: async () => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Fetch failed for ${url}: Status ${res.status}`);
          return [];
        }
        return await res.json();
      } catch (err) {
        console.error(`Error fetching from ${url}:`, err);
        return [];
      }
    };

    try {
      const data = await safeFetch('http://127.0.0.1:8000/latest-safety-alerts');

      const allAlerts: Alert[] = data.map((item: any) => ({
        id: String(alertIdCounter++),
        type: normalizeAlertType(item.alert),         
        originalAlertType: item.alert,                
        location: item.camera_name,
        timestamp: item.timestamp,
        timeElapsed: item.time_elapsed,
        status: 'active',
        description: item.reason,
        imageBase64: item.image_base64,
      }));

      console.log("Fetched alerts:", allAlerts);
      set({ alerts: [...allAlerts] });
    } catch (err) {
      console.error('Unexpected error in fetchAlerts:', err);
    }
  },

  respondAlert: async (id) => {
    const state = get();
    const alert = state.alerts.find((a) => a.id === id);

    if (!alert) {
      console.warn("Alert not found with ID:", id);
      return;
    }

    const payload = {
      alert: alert.originalAlertType, 
      reason: alert.description,
      camera_name: alert.location,
      timestamp: alert.timestamp,
    };

    console.log("Sending POST to /respond with:", JSON.stringify(payload, null, 2));

    try {
      const res = await fetch('http://127.0.0.1:8000/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
        toast.success(`${alert.originalAlertType} in ${alert.location} responded successfully`);
      } else {
        let message = 'Invalid request';
        try {
          const errData = await res.json();
          console.error("Respond error:", errData);
          if (errData && typeof errData === 'object' && 'detail' in errData) {
            message = errData.detail;
          }
        } catch (e) {
          console.warn("Failed to parse response error JSON");
        }
        toast.error(`Respond failed: ${message}`);
      }
    } catch (err) {
      console.error("Respond network error:", err);
      toast.error("Network error while responding");
    }
  },
}));

function normalizeAlertType(alert: string): Alert['type'] {
  const lower = alert.toLowerCase();
  if (lower.includes('intrusion')) return 'intrusion';
  if (lower.includes('fall')) return 'fall';
  if (lower.includes('tamper')) return 'tampering';
  return 'intrusion';
}
