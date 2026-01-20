import { create } from 'zustand';
import { toast } from 'sonner';

export interface Queue {
  id: string;
  name: string;
  currentLength: number;
  waitTime: number;
  status: 'low' | 'medium' | 'high';
  zoneType: 'Billing Zone' | 'Occupancy';
}

interface HourlyTrend {
  time: string;
  total_length: number;
  waiting_time: number;
}

interface QueueState {
  queues: Queue[];
  trendData: HourlyTrend[] | null;
  selectedZone: 'Billing Zone' | 'Occupancy';
  setSelectedZone: (zone: 'Billing Zone' | 'Occupancy') => void;
  fetchQueues: () => Promise<void>;
  fetchQueueTrend: (zoneType: string, cameraName: string) => Promise<void>;
}

export const useQueueStore = create<QueueState>((set) => ({
  queues: [],
  trendData: null,
  selectedZone: 'Billing Zone',

  setSelectedZone: (zone) => set({ selectedZone: zone }),

  fetchQueues: async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/camera-latest-count');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const getStatus = (length: number): Queue['status'] => {
        if (length <= 5) return 'low';
        if (length <= 15) return 'medium';
        return 'high';
      };

      const queues = data.flatMap((zone: any, zoneIdx: number) =>
        zone.data.map((cam: any, i: number) => ({
          id: `${zoneIdx}-${i}`,
          name: cam.camera_name,
          currentLength: cam.total_length,
          waitTime: cam.waiting_time,
          status: getStatus(cam.total_length),
          zoneType: zone.zone_type,
        }))
      );

      set({ queues });
    } catch (error) {
      console.error(error);
    }
  },

  fetchQueueTrend: async (zoneType, cameraName) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/camera-hourly-trend/${zoneType}/${cameraName}`
      );
      if (!res.ok) throw new Error('Failed to fetch trend data');
      const data = await res.json();

      if (data.length === 0) {
        toast.warning('No trend data available');
      } else {
        toast.success('Trend data loaded');
      }

      set({ trendData: data });
    } catch (error) {
      toast.error('Failed to fetch trend data');
      set({ trendData: [] });
      console.error(error);
    }
  },
}));
