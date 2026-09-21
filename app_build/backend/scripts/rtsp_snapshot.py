import sys
import cv2
import os

def capture_snapshot(rtsp_url, output_path):
    os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        sys.stderr.write(f"Could not open RTSP: {rtsp_url}\n")
        sys.exit(1)
    ret, frame = cap.read()
    cap.release()
    if ret and frame is not None:
        cv2.imwrite(output_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        sys.exit(0)
    else:
        sys.stderr.write("Failed to read frame from RTSP\n")
        sys.exit(1)

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'rtsp://192.168.1.74:554/live/ch1'
    out = sys.argv[2] if len(sys.argv) > 2 else 'test_snap.jpg'
    capture_snapshot(url, out)
