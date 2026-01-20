# Logic and processing for kitchen object tracking and logging
import cv2 #type: ignore
import numpy as np
from ultralytics import YOLO #type: ignore
import os
import json
import pandas as pd
from scipy.spatial import distance #type: ignore
from collections import deque
from datetime import datetime, timedelta
import time

# --- CONFIG ---
# model_path = r"Models\small_best_76_13_11.pt"
model_path = r"C:\Users\ntrst\Downloads\best (12).pt"
stream_url = r"D:\company videos\Ekkagra\2025-10-28\video_20251028_163322.avi"
output_folder = r"Processed_Data"
csv_folder = r"Data"
target_classes = {"drink", "food", "parcel"}
CUSTOM_LABELS = ["Drink", "Food", "Parcel"]
conf_threshold = 0.25
trail_length = 30
time_threshold = 1  # minutes per clip
save_video = True  # Set to False to disable video saving
skip_frame = 2  # Process every nth frame

# Create output folders if they don't exist
os.makedirs(output_folder, exist_ok=True)
os.makedirs(csv_folder, exist_ok=True)

# Excel file path
excel_file_path = os.path.join(csv_folder, "Processed_Data.xlsx")

# Global variable to track current video path
current_video_path = None

# --- CENTROID TRACKER ---
class CentroidTracker:
    def __init__(self, max_disappeared=30, max_distance=50, trail_length=30, csv_callback=None):
        self.next_object_id = 0
        self.objects = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        self.object_categories = {}
        self.object_roi_history = {}
        # Persistent delivery counters
        self.total_delivered_drinks = 0
        self.total_delivered_food = 0
        self.total_delivered_parcels = 0
        # Trail tracking
        self.trails = {}
        self.trail_length = trail_length
        # CSV callback function
        self.csv_callback = csv_callback
        
    def register(self, centroid, category):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.object_categories[self.next_object_id] = category
        self.object_roi_history[self.next_object_id] = {'kitchen': False, 'delivered': False}
        self.trails[self.next_object_id] = deque(maxlen=self.trail_length)
        self.trails[self.next_object_id].append(centroid)
        self.next_object_id += 1
        return self.next_object_id - 1
    
    def deregister(self, object_id):
        if object_id in self.object_roi_history and self.object_roi_history[object_id]['delivered']:
            if object_id in self.object_categories:
                category = self.object_categories[object_id]
                if category == "Drink":
                    self.total_delivered_drinks += 1
                elif category == "Food":
                    self.total_delivered_food += 1
                elif category == "Parcel":
                    self.total_delivered_parcels += 1
                print(f"Object {object_id} ({category}) marked as delivered!")
        
        del self.objects[object_id]
        del self.disappeared[object_id]
        if object_id in self.object_categories:
            del self.object_categories[object_id]
        if object_id in self.object_roi_history:
            del self.object_roi_history[object_id]
        if object_id in self.trails:
            del self.trails[object_id]
    
    def update(self, detections, kitchen_roi):
        centroids = [det[0] for det in detections]
        categories = [det[1] for det in detections]
        
        if len(centroids) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects
        
        if len(self.objects) == 0:
            for i, centroid in enumerate(centroids):
                self.register(centroid, categories[i])
        else:
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())
            
            if len(object_centroids) > 0:
                D = distance.cdist(np.array(object_centroids), np.array(centroids))
                rows = D.min(axis=1).argsort()
                cols = D.argmin(axis=1)[rows]
                
                used_rows = set()
                used_cols = set()
                
                for row, col in zip(rows, cols):
                    if row in used_rows or col in used_cols:
                        continue
                    
                    object_id = object_ids[row]
                    dist = D[row, col]
                    
                    if dist > self.max_distance:
                        continue
                    
                    existing_category = self.object_categories.get(object_id)
                    new_category = categories[col]
                    
                    if existing_category != new_category:
                        continue
                    
                    self.objects[object_id] = centroids[col]
                    self.disappeared[object_id] = 0
                    self.trails[object_id].append(centroids[col])
                    
                    in_kitchen = point_in_polygon(centroids[col], kitchen_roi)
                    history = self.object_roi_history[object_id]
                    
                    if in_kitchen:
                        if history['delivered']:
                            # Object re-entered kitchen - log decrement
                            if self.csv_callback:
                                self.csv_callback(existing_category, -1)
                            
                            if existing_category == "Drink":
                                self.total_delivered_drinks = max(0, self.total_delivered_drinks - 1)
                            elif existing_category == "Food":
                                self.total_delivered_food = max(0, self.total_delivered_food - 1)
                            elif existing_category == "Parcel":
                                self.total_delivered_parcels = max(0, self.total_delivered_parcels - 1)
                            print(f"Object {object_id} ({existing_category}) re-entered kitchen → subtracting from delivered total.")
                            history['delivered'] = False
                        history['kitchen'] = True
                    else:
                        dist_from_roi = cv2.pointPolygonTest(kitchen_roi, centroids[col], True)
                        if history['kitchen'] and not history['delivered'] and dist_from_roi < -5:
                            history['delivered'] = True
                            # Object left kitchen - log increment
                            if self.csv_callback:
                                self.csv_callback(existing_category, 1)
                    
                    used_rows.add(row)
                    used_cols.add(col)
                
                unused_rows = set(range(0, D.shape[0])).difference(used_rows)
                unused_cols = set(range(0, D.shape[1])).difference(used_cols)
                
                if D.shape[0] >= D.shape[1]:
                    for row in unused_rows:
                        object_id = object_ids[row]
                        self.disappeared[object_id] += 1
                        if self.disappeared[object_id] > self.max_disappeared:
                            self.deregister(object_id)
                else:
                    for col in unused_cols:
                        self.register(centroids[col], categories[col])
        
        return self.objects


# --- UTILITY FUNCTIONS ---
def point_in_polygon(point, polygon):
    point_float = (float(point[0]), float(point[1]))
    return cv2.pointPolygonTest(polygon, point_float, False) >= 0

def draw_polygon(img, points, color, thickness=2):
    if len(points) > 1:
        pts = np.array(points, np.int32)
        pts = pts.reshape((-1, 1, 2))
        cv2.polylines(img, [pts], True, color, thickness)
    for point in points:
        cv2.circle(img, point, 5, color, -1)

def get_counts_by_roi(tracker, kitchen_roi):
    kitchen_drinks = kitchen_food = kitchen_parcels = 0
    
    for obj_id, centroid in tracker.objects.items():
        if obj_id in tracker.object_categories:
            category = tracker.object_categories[obj_id]
            if point_in_polygon(centroid, kitchen_roi):
                if category == "Drink":
                    kitchen_drinks += 1
                elif category == "Food":
                    kitchen_food += 1
                elif category == "Parcel":
                    kitchen_parcels += 1
    
    delivered_drinks = tracker.total_delivered_drinks
    delivered_food = tracker.total_delivered_food
    delivered_parcels = tracker.total_delivered_parcels
    
    for obj_id, history in tracker.object_roi_history.items():
        if history['delivered'] and obj_id in tracker.object_categories:
            category = tracker.object_categories[obj_id]
            if category == "Drink":
                delivered_drinks += 1
            elif category == "Food":
                delivered_food += 1
            elif category == "Parcel":
                delivered_parcels += 1
    
    return {
        'kitchen': {'drinks': kitchen_drinks, 'food': kitchen_food, 'parcels': kitchen_parcels},
        'delivered': {'drinks': delivered_drinks, 'food': delivered_food, 'parcels': delivered_parcels}
    }

def draw_trails(frame, tracker):
    color_map = {
        "Drink": (255, 0, 0),
        "Food": (0, 255, 0),
        "Parcel": (0, 165, 255)
    }
    for obj_id, trail in tracker.trails.items():
        if len(trail) < 2 or obj_id not in tracker.object_categories:
            continue
        category = tracker.object_categories[obj_id]
        color = color_map.get(category, (255, 255, 255))
        points = list(trail)
        for i in range(1, len(points)):
            alpha = i / len(points)
            thickness = max(1, int(3 * alpha))
            cv2.line(frame, points[i-1], points[i], color, thickness, cv2.LINE_AA)
        if len(points) >= 2:
            cv2.arrowedLine(frame, points[-2], points[-1], color, 3, cv2.LINE_AA, tipLength=0.3)

def save_to_excel(date, timestamp, category, change, video_path):
    """Save increment/decrement event to Excel file immediately with video path"""
    
    # Create row data with video_path column
    row_data = {
        'Date': date,
        'Timestamp': timestamp,
        'Total Food': change if category == "Food" else 0,
        'Total Drinks': change if category == "Drink" else 0,
        'Total Parcels': change if category == "Parcel" else 0,
        'Video_Path': video_path if video_path else "N/A"
    }
    
    # Check if file exists
    if os.path.isfile(excel_file_path):
        # Read existing data
        df_existing = pd.read_excel(excel_file_path)
        # Append new row
        df_new = pd.DataFrame([row_data])
        df_combined = pd.concat([df_existing, df_new], ignore_index=True)
    else:
        # Create new DataFrame
        df_combined = pd.DataFrame([row_data])
    
    # Save to Excel
    df_combined.to_excel(excel_file_path, index=False)
    print(f"Excel updated: {excel_file_path}")

# --- MAIN PROCESSING ---
print("Loading YOLO model...")
model = YOLO(model_path)
class_names = {i: n.lower() for i, n in model.names.items()}

# Kitchen ROI
kitchen_roi = np.array([[368,518],
    [709, 245], [865, 317], [1222, 30], [1502, 114],
    [1345, 726], [1558, 822], [1471, 1074], [811, 1070],
    [372, 1068], [324, 1036], [602, 668]
], dtype=np.int32)

# Excel callback function
def excel_logging_callback(category, change):
    """Callback function to log Excel entries immediately when delivery events occur"""
    global current_video_path
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    timestamp_str = now.strftime("%I:%M:%S %p")
    
    # Use current video path or "N/A" if video saving is disabled
    video_path_to_log = current_video_path if current_video_path else "N/A"
    
    save_to_excel(date_str, timestamp_str, category, change, video_path_to_log)
    action = "delivered" if change > 0 else "returned"
    print(f"Excel logged: {category} {action} at {timestamp_str} (Video: {video_path_to_log})")

# Initialize tracker with Excel callback
tracker = CentroidTracker(max_disappeared=10, max_distance=100, trail_length=trail_length, csv_callback=excel_logging_callback)

# Connect to CCTV stream
print(f"Connecting to CCTV stream: {stream_url}")
cap = cv2.VideoCapture(stream_url)

if not cap.isOpened():
    print("Error: Cannot connect to CCTV stream!")
    exit()

# Get stream properties
ret, first_frame = cap.read()
if not ret:
    print("Error: Cannot read from stream!")
    cap.release()
    exit()

frame_width = first_frame.shape[1]
frame_height = first_frame.shape[0]
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
fourcc = cv2.VideoWriter_fourcc(*'mp4v')

print(f"Connected to stream - Resolution: {frame_width}x{frame_height}, FPS: {fps}")

clip_number = 1
total_frame_count = 0
frame_counter = 0
skip_frame_counter = 0
frames_per_clip = int(fps * 60 * time_threshold)

# Initialize first clip
start_time = datetime.now()
timestamp_str = start_time.strftime("%Y%m%d_%H%M%S")
date_str = start_time.strftime("%Y-%m-%d")

# Create date folder inside Processed_Data and initialize video writer
output_filename = None
if save_video:
    date_folder = os.path.join(output_folder, date_str)
    os.makedirs(date_folder, exist_ok=True)
    
    output_filename = f"clip_{timestamp_str}.mp4"
    output_path = os.path.join(date_folder, output_filename)
    
    # Set current video path (relative path for better portability)
    current_video_path = os.path.join(date_str, output_filename)
    
    out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
    print(f"\nRecording clip {clip_number}: {output_filename}")
    print(f"Video path: {current_video_path}")
    print(f"Recording for {time_threshold} minute(s) ({frames_per_clip} frames)")
else:
    out = None
    current_video_path = None
    print(f"\nVideo saving disabled. Running in display-only mode.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Stream interrupted. Saving current clip and exiting...")
        break
    
    total_frame_count += 1
    frame_counter += 1
    skip_frame_counter += 1
    
    if frame.shape[1] != frame_width or frame.shape[0] != frame_height:
        frame = cv2.resize(frame, (frame_width, frame_height))
    
    if skip_frame < 1:
        skip_frame = 1

    detections = []
    tracked_objects = tracker.objects
    processed_this_frame = False
    
    # Process detections only for every skip_frame-th frame
    if skip_frame_counter % skip_frame == 0:
        processed_this_frame = True
        results = model.predict(frame, conf=conf_threshold, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                cls_name = class_names.get(cls_id, "unknown")
                if cls_name not in target_classes:
                    continue
                centroid = (int((x1 + x2) / 2), int((y1 + y2) / 2))
                category = cls_name.capitalize()
                detections.append((centroid, category))
                color = (255, 0, 0) if category == "Drink" else (0, 255, 0) if category == "Food" else (0, 165, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{category} {conf:.2f}", (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                cv2.circle(frame, centroid, 4, color, -1)
        
        tracked_objects = tracker.update(detections, kitchen_roi)
    
    draw_trails(frame, tracker)
    
    for obj_id, centroid in tracked_objects.items():
        if obj_id in tracker.object_categories:
            category = tracker.object_categories[obj_id]
            color = (255, 0, 0) if category == "Drink" else (0, 255, 0) if category == "Food" else (0, 165, 255)
            cv2.circle(frame, centroid, 6, color, 2)
            cv2.putText(frame, f"ID:{obj_id}", (centroid[0] + 10, centroid[1]),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Draw ROI
    draw_polygon(frame, kitchen_roi, (0, 255, 255), 2)
    cv2.putText(frame, "KITCHEN", (kitchen_roi[0][0], kitchen_roi[0][1] - 10),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    
    # Display counts
    counts = get_counts_by_roi(tracker, kitchen_roi)
    y_offset = 30
    cv2.putText(frame, "=== LIVE IN KITCHEN ===", (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    y_offset += 35
    cv2.putText(frame, f"Drinks: {counts['kitchen']['drinks']} | Food: {counts['kitchen']['food']} | Parcels: {counts['kitchen']['parcels']}", 
               (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    y_offset += 50
    cv2.putText(frame, "=== TOTAL DELIVERED ===", (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    y_offset += 35
    cv2.putText(frame, f"Drinks: {counts['delivered']['drinks']} | Food: {counts['delivered']['food']} | Parcels: {counts['delivered']['parcels']}", 
               (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Display clip info
    current_time = datetime.now().strftime("%H:%M:%S")
    frames_remaining = frames_per_clip - frame_counter
    cv2.putText(frame, f"Clip: {clip_number} | Time: {current_time} | Frames remaining: {frames_remaining} | Frame: {frame_counter}/{frames_per_clip}", 
               (20, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    if save_video and out is not None and processed_this_frame:
        out.write(frame)
    
    # Check if it's time to start a new clip
    if frame_counter >= frames_per_clip:
        if save_video and out is not None:
            out.release()
            print(f"Clip {clip_number} saved: {current_video_path}")
        print(f"   Total frames: {frame_counter}")
        
        # Start new clip
        clip_number += 1
        frame_counter = 0
        start_time = datetime.now()
        timestamp_str = start_time.strftime("%Y%m%d_%H%M%S")
        date_str = start_time.strftime("%Y-%m-%d")
        
        if save_video:
            date_folder = os.path.join(output_folder, date_str)
            os.makedirs(date_folder, exist_ok=True)
            
            output_filename = f"clip_{timestamp_str}.mp4"
            output_path = os.path.join(date_folder, output_filename)
            
            # Update current video path
            current_video_path = os.path.join(date_str, output_filename)
            
            out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
            print(f"\nRecording clip {clip_number}: {output_filename}")
            print(f"Video path: {current_video_path}")
            print(f"Recording for {time_threshold} minute(s) ({frames_per_clip} frames)")
        else:
            out = None
            current_video_path = None
    
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break

# Cleanup
if save_video and out is not None:
    out.release()
cap.release()
cv2.destroyAllWindows()

if save_video and current_video_path:
    print(f"\nClip {clip_number} saved: {current_video_path}")
else:
    print(f"\nVideo saving disabled. No clip files generated.")
print(f"Processing complete! Total clips: {clip_number}")
if save_video:
    print(f"Videos saved to: {output_folder}")
print(f"Excel saved to: {excel_file_path}")