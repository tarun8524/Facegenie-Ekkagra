// store/feedbackStore.ts
import { create } from 'zustand';
import { toast } from 'sonner'

interface Feedback {
  id: string;
  user: string;
  rating: number;
  comment: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  location: string;
}

interface FeedbackAnalytics {
  ratings: { [key: string]: number };
  sentiments: { [key: string]: number };
}

interface FeedbackStore {
  feedbackList: Feedback[];
  analytics: FeedbackAnalytics;
  fetchFeedbackList: () => void;
  fetchFeedbackAnalytics: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  feedbackList: [],
  analytics: { ratings: {}, sentiments: {} },

  fetchFeedbackList: async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/recent-feedbacks');
      const data = await res.json();
      if (data.length === 0) {
        toast.info("No feedback data available");
        return;
      }

      const formatted = data.map((item: any, index: number) => ({
        id: String(index + 1),
        user: item.name,
        rating: item.rating,
        comment: item.feedback,
        sentiment: item.sentiment_label,
        timestamp: item.time_elapsed,
        location: item.camera_name,
      }));

      set({ feedbackList: formatted });
      toast.success("Feedback data loaded successfully");
    } catch {
      toast.error("Failed to fetch feedback data");
    }
  },

  fetchFeedbackAnalytics: async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/rating-sentiment-counts');
      const data = await res.json();
      if (!data) {
        toast.info("No analytics data available");
        return;
      }

      set({ analytics: data });
      toast.success("Analytics data loaded successfully");
    } catch {
      toast.error("Failed to fetch analytics data");
    }
  },
}));
