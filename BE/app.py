# Backend FastAPI application for real-time analytics with WebSockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
from pydantic import BaseModel
import uvicorn
import asyncio
import json
import base64
import os
import platform
from fastapi import HTTPException
from fastapi.responses import FileResponse
import subprocess

app = FastAPI(title="Analytics API (WebSocket)", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data from Excel file
DATA_FILE = r"Data\Processed_Data.xlsx"

def load_data():
    """Load and prepare data from Excel file"""
    try:
        df = pd.read_excel(DATA_FILE)
        df['DateTime'] = pd.to_datetime(df['Date'] + ' ' + df['Timestamp'], format='%Y-%m-%d %I:%M:%S %p')
        return df
    except Exception as e:
        raise Exception(f"Error loading data: {str(e)}")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Analytics API with WebSocket Support",
        "websocket_endpoints": {
            "totals": "ws://localhost:8000/ws/totals/{period}",
            "detailed": "ws://localhost:8000/ws/detailed/{period}",
            "custom_range": "ws://localhost:8000/ws/custom-range?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD"
        },
        "update_interval": "5 seconds"
    }


# ============ WEBSOCKET 1: Total Counts by Period ============
@app.websocket("/ws/totals/{period}")
async def websocket_totals(websocket: WebSocket, period: str):
    """
    WebSocket endpoint for real-time total counts
    
    Periods: 1hr, 24hr, 7d, 30d, 90d
    Sends updates every 5 seconds
    """
    await websocket.accept()
    
    period_map = {
        "1hr": timedelta(hours=1),
        "24hr": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90)
    }
    
    if period not in period_map:
        await websocket.send_json({
            "error": f"Invalid period. Choose from: {list(period_map.keys())}"
        })
        await websocket.close()
        return
    
    try:
        while True:
            df = load_data()
            now = datetime.now()
            delta = period_map[period]
            start_time = now - delta
            
            # Filter data for the period
            filtered_df = df[(df['DateTime'] >= start_time) & (df['DateTime'] <= now)]
            
            response = {
                "period": period,
                "total_food": int(filtered_df['Total Food'].sum()) if not filtered_df.empty else 0,
                "total_drinks": int(filtered_df['Total Drinks'].sum()) if not filtered_df.empty else 0,
                "total_parcels": int(filtered_df['Total Parcels'].sum()) if not filtered_df.empty else 0,
                "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "end_time": now.strftime("%Y-%m-%d %H:%M:%S"),
                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            await websocket.send_json(response)
            await asyncio.sleep(5)  # Send updates every 5 seconds
            
    except WebSocketDisconnect:
        print(f"Client disconnected from /ws/totals/{period}")
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()


# ============ WEBSOCKET 2: Detailed Time Series Data ============
@app.websocket("/ws/detailed/{period}")
async def websocket_detailed(websocket: WebSocket, period: str):
    """
    WebSocket endpoint for real-time detailed time-series data
    
    Periods: 1hr, 24hr, 7d, 30d, 90d
    Sends updates every 5 seconds
    """
    await websocket.accept()
    
    valid_periods = ["1hr", "24hr", "7d", "30d", "90d"]
    
    if period not in valid_periods:
        await websocket.send_json({
            "error": f"Invalid period. Choose from: {valid_periods}"
        })
        await websocket.close()
        return
    
    try:
        while True:
            df = load_data()
            now = datetime.now()
            
            if period == "1hr":
                # Last 1 hour - 15-minute intervals
                start_time = now - timedelta(hours=1)
                filtered_df = df[(df['DateTime'] >= start_time) & (df['DateTime'] <= now)].copy()
                
                filtered_df['TimeSlot'] = filtered_df['DateTime'].dt.floor('15min').dt.strftime("%Y-%m-%d %H:%M")
                
                intervals = filtered_df.groupby('TimeSlot').agg({
                    'Total Food': 'sum',
                    'Total Drinks': 'sum',
                    'Total Parcels': 'sum'
                }).reset_index()
                
                data = [
                    {
                        "timestamp": row['TimeSlot'],
                        "food_count": int(row['Total Food']),
                        "drinks_count": int(row['Total Drinks']),
                        "parcels_count": int(row['Total Parcels'])
                    }
                    for _, row in intervals.iterrows()
                ]
                
                summary = {
                    "total_intervals": len(data),
                    "total_food": int(filtered_df['Total Food'].sum()),
                    "total_drinks": int(filtered_df['Total Drinks'].sum()),
                    "total_parcels": int(filtered_df['Total Parcels'].sum())
                }
                
            elif period == "24hr":
                # Last 24 hours - hourly aggregation
                start_time = now - timedelta(hours=24)
                filtered_df = df[(df['DateTime'] >= start_time) & (df['DateTime'] <= now)].copy()
                filtered_df['Hour'] = filtered_df['DateTime'].dt.strftime("%Y-%m-%d %H:00")
                
                hourly = filtered_df.groupby('Hour').agg({
                    'Total Food': 'sum',
                    'Total Drinks': 'sum',
                    'Total Parcels': 'sum'
                }).reset_index()
                
                data = [
                    {
                        "timestamp": row['Hour'],
                        "food_count": int(row['Total Food']),
                        "drinks_count": int(row['Total Drinks']),
                        "parcels_count": int(row['Total Parcels'])
                    }
                    for _, row in hourly.iterrows()
                ]
                
                summary = {
                    "total_hours": len(data),
                    "total_food": int(filtered_df['Total Food'].sum()),
                    "total_drinks": int(filtered_df['Total Drinks'].sum()),
                    "total_parcels": int(filtered_df['Total Parcels'].sum())
                }
                
            elif period == "7d":
                # Last 7 days - daily aggregation
                start_time = now - timedelta(days=7)
                filtered_df = df[(df['DateTime'] >= start_time) & (df['DateTime'] <= now)].copy()
                filtered_df['DayName'] = filtered_df['DateTime'].dt.strftime("%A (%Y-%m-%d)")
                
                daily = filtered_df.groupby('DayName').agg({
                    'Total Food': 'sum',
                    'Total Drinks': 'sum',
                    'Total Parcels': 'sum'
                }).reset_index()
                
                data = [
                    {
                        "timestamp": row['DayName'],
                        "food_count": int(row['Total Food']),
                        "drinks_count": int(row['Total Drinks']),
                        "parcels_count": int(row['Total Parcels'])
                    }
                    for _, row in daily.iterrows()
                ]
                
                summary = {
                    "total_days": len(data),
                    "total_food": int(filtered_df['Total Food'].sum()),
                    "total_drinks": int(filtered_df['Total Drinks'].sum()),
                    "total_parcels": int(filtered_df['Total Parcels'].sum())
                }
                
            elif period in ["30d", "90d"]:
                # Last 30/90 days - aggregation by day of week
                days = 30 if period == "30d" else 90
                start_time = now - timedelta(days=days)
                filtered_df = df[(df['DateTime'] >= start_time) & (df['DateTime'] <= now)].copy()
                filtered_df['DayOfWeek'] = filtered_df['DateTime'].dt.day_name()
                
                day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                
                weekly = filtered_df.groupby('DayOfWeek').agg({
                    'Total Food': 'sum',
                    'Total Drinks': 'sum',
                    'Total Parcels': 'sum'
                }).reindex(day_order).fillna(0).reset_index()
                
                data = [
                    {
                        "timestamp": f"Total {row['DayOfWeek']}s",
                        "food_count": int(row['Total Food']),
                        "drinks_count": int(row['Total Drinks']),
                        "parcels_count": int(row['Total Parcels'])
                    }
                    for _, row in weekly.iterrows()
                ]
                
                summary = {
                    "period_days": days,
                    "total_food": int(filtered_df['Total Food'].sum()),
                    "total_drinks": int(filtered_df['Total Drinks'].sum()),
                    "total_parcels": int(filtered_df['Total Parcels'].sum())
                }
            
            response = {
                "period": period,
                "data": data,
                "summary": summary,
                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            await websocket.send_json(response)
            await asyncio.sleep(5)  # Send updates every 5 seconds
            
    except WebSocketDisconnect:
        print(f"Client disconnected from /ws/detailed/{period}")
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()


# ============ WEBSOCKET 3: Custom Date Range ============
@app.websocket("/ws/custom-range")
async def websocket_custom_range(websocket: WebSocket):
    """
    WebSocket endpoint for custom date range with real-time updates
    
    Client should send: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    Server sends updates every 5 seconds
    """
    await websocket.accept()
    
    try:
        # Wait for client to send date range parameters
        params = await websocket.receive_json()
        
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        
        if not start_date or not end_date:
            await websocket.send_json({
                "error": "Missing parameters. Send: {\"start_date\": \"YYYY-MM-DD\", \"end_date\": \"YYYY-MM-DD\"}"
            })
            await websocket.close()
            return
        
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
        except ValueError:
            await websocket.send_json({
                "error": "Invalid date format. Use YYYY-MM-DD"
            })
            await websocket.close()
            return
        
        if start_dt > end_dt:
            await websocket.send_json({
                "error": "Start date must be before end date"
            })
            await websocket.close()
            return
        
        while True:
            df = load_data()
            now = datetime.now()
            
            # Filter data
            filtered_df = df[(df['DateTime'] >= start_dt) & (df['DateTime'] <= end_dt)].copy()
            
            if filtered_df.empty:
                response = {
                    "start_date": start_date,
                    "end_date": end_date,
                    "total_food": 0,
                    "total_drinks": 0,
                    "total_parcels": 0,
                    "total_days": 0,
                    "daily_breakdown": [],
                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
                }
            else:
                # Daily breakdown
                filtered_df['DateOnly'] = filtered_df['DateTime'].dt.date
                daily = filtered_df.groupby('DateOnly').agg({
                    'Total Food': 'sum',
                    'Total Drinks': 'sum',
                    'Total Parcels': 'sum'
                }).reset_index()
                
                daily_breakdown = [
                    {
                        "date": str(row['DateOnly']),
                        "food_count": int(row['Total Food']),
                        "drinks_count": int(row['Total Drinks']),
                        "parcels_count": int(row['Total Parcels'])
                    }
                    for _, row in daily.iterrows()
                ]
                
                response = {
                    "start_date": start_date,
                    "end_date": end_date,
                    "total_food": int(filtered_df['Total Food'].sum()),
                    "total_drinks": int(filtered_df['Total Drinks'].sum()),
                    "total_parcels": int(filtered_df['Total Parcels'].sum()),
                    "total_days": len(daily_breakdown),
                    "daily_breakdown": daily_breakdown,
                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
                }
            
            await websocket.send_json(response)
            await asyncio.sleep(5)  # Send updates every 5 seconds
            
    except WebSocketDisconnect:
        print("Client disconnected from /ws/custom-range")
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()

# ============ WEBSOCKET 4: Original Excel Data with Date Range ============
@app.websocket("/ws/raw-data")
async def websocket_raw_data(websocket: WebSocket):
    """
    WebSocket endpoint for original Excel data with date filtering
    
    Client can send: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    If not provided, defaults to last 24 hours
    Sends updates every 5 seconds
    """
    await websocket.accept()
    
    try:
        # Wait for client parameters (with timeout)
        try:
            params = await asyncio.wait_for(websocket.receive_json(), timeout=2.0)
            start_date = params.get("start_date")
            end_date = params.get("end_date")
        except asyncio.TimeoutError:
            # Use default 24hr if no params received
            start_date = None
            end_date = None
        
        while True:
            df = load_data()
            now = datetime.now()
            
            # Set date range
            if start_date and end_date:
                try:
                    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
                except ValueError:
                    await websocket.send_json({
                        "error": "Invalid date format. Use YYYY-MM-DD"
                    })
                    await websocket.close()
                    return
            else:
                # Default: Last 24 hours
                start_dt = now - timedelta(hours=24)
                end_dt = now
            
            # Filter data
            filtered_df = df[(df['DateTime'] >= start_dt) & (df['DateTime'] <= end_dt)].copy()
            
            # Convert to original format (list of records)
            # Replace NaN values with None/empty strings before serialization
            filtered_df = filtered_df.fillna('')
            
            records = []
            for _, row in filtered_df.iterrows():
                record = {
                    "Date": str(row['Date']) if row['Date'] else '',
                    "Timestamp": str(row['Timestamp']) if row['Timestamp'] else '',
                    "Total_Food": int(row['Total Food']) if row['Total Food'] else 0,
                    "Total_Drinks": int(row['Total Drinks']) if row['Total Drinks'] else 0,
                    "Total_Parcels": int(row['Total Parcels']) if row['Total Parcels'] else 0,
                    "Video_Path": str(row.get('Video_Path', '')) if row.get('Video_Path') else '',
                    "DateTime": row['DateTime'].strftime("%Y-%m-%d %H:%M:%S")
                }
                records.append(record)
            
            response = {
                "start_date": start_dt.strftime("%Y-%m-%d"),
                "end_date": end_dt.strftime("%Y-%m-%d"),
                "total_records": len(records),
                "data": records,
                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            # Ensure proper JSON serialization (no NaN values)
            await websocket.send_text(json.dumps(response, default=str))
            await asyncio.sleep(5)  # Send updates every 5 seconds
            
    except WebSocketDisconnect:
        print("Client disconnected from /ws/raw-data")
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()



@app.get("/video/open-folder/{video_path:path}", tags=["Video"])
async def open_video_folder(video_path: str):
    """
    Opens the folder containing the video file in the system's file explorer.
    
    Example `video_path` from DB/WebSocket:
        2025-12-08\\clip_20251208_131224.mp4
        2025-12-08/clip_20251208_131224.mp4

    This endpoint:
      - Detects OS (Windows / Ubuntu / Mac)
      - Resolves the correct base folder
      - Normalizes slashes in `video_path`
      - Opens file explorer at the video location
    """

    # -------- OS-specific base folder --------
    if platform.system() == "Windows":
        BASE_VIDEO_FOLDER = r"C:\Users\ntrst\Downloads\RESOLUTE_AI\FaceGenie\Facegenie_ekkagra_V4\BE\Processed_Data"
    else:
        BASE_VIDEO_FOLDER = "/home/ubuntu/RESOLUTE_AI/FaceGenie/Facegenie_ekkagra/BE/Processed_Videos"

    # -------- Normalize incoming path (handle \ and /) --------
    normalized_rel_path = video_path.replace("\\", "/")

    # Safely join with base folder
    full_path = os.path.join(BASE_VIDEO_FOLDER, *normalized_rel_path.split("/"))

    # Resolve to absolute real paths to avoid path traversal issues
    base_real = os.path.realpath(BASE_VIDEO_FOLDER)
    full_real = os.path.realpath(full_path)

    # Ensure requested file is inside the base folder
    if not full_real.startswith(base_real):
        raise HTTPException(status_code=400, detail="Invalid video path")

    # Check existence
    if not os.path.exists(full_real):
        raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")

    # -------- Open folder location based on OS --------
    try:
        system = platform.system()

        if system == "Windows":
            # Open Windows Explorer and select the file
            # Use Popen (no check=True) so non-zero exit codes don't cause 500
            subprocess.Popen(["explorer", "/select,", full_real])

        elif system == "Darwin":  # macOS
            # Open Finder and select the file
            subprocess.Popen(["open", "-R", full_real])

        else:  # Linux/Unix
            folder_path = os.path.dirname(full_real)

            # Try common Linux file managers; ignore non-existent ones
            opened = False
            for cmd in (["xdg-open", folder_path],
                        ["nautilus", folder_path],
                        ["dolphin", folder_path]):
                try:
                    subprocess.Popen(cmd)
                    opened = True
                    break
                except FileNotFoundError:
                    continue

            if not opened:
                raise RuntimeError("No suitable file manager found on this system")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Folder opened successfully",
                "video_path": video_path,
                "full_path": full_real,
                "operating_system": system,
            },
        )

    except Exception as e:
        # Any real Python error becomes 500
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error while opening folder: {str(e)}",
        )

# ============ WEBSOCKET: Food Count Excel Data ============

@app.websocket("/ws/food-data")
async def websocket_food_data(websocket: WebSocket):
    """
    WebSocket endpoint for sending food count history with date filtering
    
    Client sends (optional):
    {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    
    Default → Last 24 hours
    Updates every 5 seconds
    """
    await websocket.accept()

    try:
        # Get params from client (optional)
        try:
            params = await asyncio.wait_for(websocket.receive_json(), timeout=2.0)
            start_date = params.get("start_date")
            end_date = params.get("end_date")
        except:
            start_date = end_date = None

        while True:
            try:
                excel_path = os.path.join("Data", "Food_count.xlsx")
                df = pd.read_excel(excel_path)

                # Create DateTime field
                df['DateTime'] = pd.to_datetime(df['Date'] + " " + df['Time'])

                now = datetime.now()

                # Filter by user date range or last 24 hours
                if start_date and end_date:
                    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
                else:
                    start_dt = now - timedelta(hours=24)
                    end_dt = now

                filtered_df = df[(df['DateTime'] >= start_dt) & (df['DateTime'] <= end_dt)].copy()
                filtered_df = filtered_df.fillna('')

                # Convert dataframe rows → JSON structure
                records = []
                for _, row in filtered_df.iterrows():
                    records.append({
                        "Date": row['Date'],
                        "Time": row['Time'],
                        "Food_Count": int(row['Food Count']),
                        "Frame_name": str(row['Frame_name']),
                        "DateTime": row['DateTime'].strftime("%Y-%m-%d %H:%M:%S")
                    })

                response = {
                    "start_date": start_dt.strftime("%Y-%m-%d"),
                    "end_date": end_dt.strftime("%Y-%m-%d"),
                    "total_records": len(records),
                    "data": records,
                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
                }

                await websocket.send_json(response)
                await asyncio.sleep(5)

            except Exception as e:
                await websocket.send_json({"error": str(e)})
                break

    except WebSocketDisconnect:
        print("Client disconnected from /ws/food-data")

# ============ REST ENDPOINT: Get Food Frame Base64 ============

@app.get("/food-frame/{frame_name}", tags=["Food Frames"])
async def get_food_frame(frame_name: str):
    import base64
    frame_folder = "fwc_frames"

    try:
        frame_path = os.path.join(frame_folder, frame_name)

        if not os.path.exists(frame_path):
            return JSONResponse(
                status_code=404,
                content={"error": f"Frame not found: {frame_name}"}
            )

        # Read file and convert to Base64
        with open(frame_path, "rb") as f:
            img_data = f.read()
            b64 = base64.b64encode(img_data).decode("utf-8")

        ext = frame_name.lower().split('.')[-1]
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png"}.get(ext, "image/jpeg")

        return {
            "frame_name": frame_name,
            "image_base64": b64,
            "content_type": mime,
            "size_bytes": len(img_data)
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )



# Health check endpoint (kept as REST)
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        df = load_data()
        latest_time = df['DateTime'].max()
        earliest_time = df['DateTime'].min()
        return {
            "status": "healthy",
            "total_records": len(df),
            "data_file": DATA_FILE,
            "data_range": {
                "earliest": earliest_time.strftime("%Y-%m-%d %H:%M:%S"),
                "latest": latest_time.strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)