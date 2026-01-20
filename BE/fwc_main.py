import cv2
from ultralytics import YOLO
from datetime import datetime
import os
import pandas as pd

# ------------------- CONFIG -------------------
MODEL_PATH = r"Models\V8_fwc_94_3_12.pt"  # your model path
STREAM_URL = r"D:\company videos\Ekkagra\2025-11-28\record_17-11-36.mp4"  # replace with your stream URL or video path
FOOD_CLASS_ID = 1  # change based on your model
TIME_THRESHOLD_MINUTES = 5  # sample frame every 5 minutes

BASE_DIR = "Data"
FRAME_DIR = "fwc_frames"
EXCEL_PATH = os.path.join(BASE_DIR, "Food_count.xlsx")

# Create required folders
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(FRAME_DIR, exist_ok=True)

# ------------------- LOAD MODEL -------------------
model = YOLO(MODEL_PATH)

# ------------------- VIDEO CAPTURE -------------------
cap = cv2.VideoCapture(STREAM_URL)

if not cap.isOpened():
    print("Error: Cannot open video")
    exit()

last_capture_time = None
last_food_count = 0
last_capture_label = "N/A"

while True:
    ret, frame = cap.read()
    if not ret:
        break

    now = datetime.now()

    # Check if it's time to sample a frame
    if (last_capture_time is None or
        (now - last_capture_time).total_seconds() >= TIME_THRESHOLD_MINUTES * 60):

        # Make a copy to draw on and save
        processed_frame = frame.copy()

        # Run YOLO on this frame
        results = model(processed_frame, conf=0.45)

        food_count = 0

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls = int(box.cls[0])
                if cls == FOOD_CLASS_ID:
                    food_count += 1
                    x1, y1, x2, y2 = box.xyxy[0]
                    cv2.rectangle(processed_frame,
                                  (int(x1), int(y1)),
                                  (int(x2), int(y2)),
                                  (0, 255, 0), 2)
                    cv2.putText(processed_frame, "Food",
                                (int(x1), int(y1) - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                                (0, 255, 0), 2)

        # Prepare timestamp strings
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")

        # Frame filename
        frame_name = f"frame_{timestamp_str}.jpg"
        frame_path = os.path.join(FRAME_DIR, frame_name)

        # Save processed frame
        cv2.imwrite(frame_path, processed_frame)

        # Update "last" values for display
        last_food_count = food_count
        last_capture_label = time_str
        last_capture_time = now

        # Save to Excel
        new_row = {
            "Date": date_str,
            "Time": time_str,
            "Food Count": food_count,
            "Frame_name": frame_name
        }

        if os.path.exists(EXCEL_PATH):
            df = pd.read_excel(EXCEL_PATH)
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        else:
            df = pd.DataFrame([new_row])

        df.to_excel(EXCEL_PATH, index=False)

        # Show the processed frame for this capture
        frame_to_show = processed_frame
    else:
        # For non-sampled frames, just show the raw frame
        frame_to_show = frame

    # Overlay last count info on the frame being shown
    cv2.putText(frame_to_show,
                f"Last Food Count ({last_capture_label}): {last_food_count}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1,
                (0, 0, 255), 3)

    # cv2.imshow("Food Detection", frame_to_show)

    # if cv2.waitKey(1) & 0xFF == ord('q'):
    #     break

cap.release()
cv2.destroyAllWindows()
