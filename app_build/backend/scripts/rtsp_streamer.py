import sys
import cv2
import time
import os

def stream_rtsp(rtsp_url, target_fps=15, quality=65):
    # Suppress OpenCV / ffmpeg verbose logs
    os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'
    
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        sys.stderr.write(f"Failed to open RTSP stream: {rtsp_url}\n")
        sys.exit(1)
        
    frame_interval = 1.0 / target_fps
    
    last_snap_save = 0
    uploads_dir = os.path.join(os.path.dirname(__file__), '../uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    snap_cache_path = os.path.join(uploads_dir, 'latest_yuicam_snap.jpg')

    try:
        while True:
            t_start = time.time()
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue
            
            # Encode frame to JPEG
            ret, jpeg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
            if not ret:
                continue
                
            data = jpeg.tobytes()
            header = (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n'
                b'Content-Length: ' + str(len(data)).encode('ascii') + b'\r\n\r\n'
            )
            sys.stdout.buffer.write(header + data + b'\r\n')
            sys.stdout.buffer.flush()

            # Cache latest frame every 1.5 seconds for instant biometric analysis & snapshots
            now = time.time()
            if now - last_snap_save > 1.5:
                last_snap_save = now
                try:
                    with open(snap_cache_path, 'wb') as f:
                        f.write(data)
                except Exception:
                    pass
            
            # Maintain stable target FPS
            elapsed = time.time() - t_start
            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)
    except (BrokenPipeError, KeyboardInterrupt, IOError):
        pass
    finally:
        cap.release()

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'rtsp://192.168.1.74:554/live/ch1'
    fps = int(sys.argv[2]) if len(sys.argv) > 2 else 15
    quality = int(sys.argv[3]) if len(sys.argv) > 3 else 65
    stream_rtsp(url, target_fps=fps, quality=quality)
