# RTSP Stream Display Bugfix

## Introduction

Users can add RTSP cameras with URLs (e.g., `rtsp://716f898c7b71.entrypoint.cloud.wowza.com:1935/app-8F9K44lJ/304679fe_stream2`) through the Camera Management interface, but the live stream is not displayed in the LiveCamera component. The component currently only supports browser-based camera access via `getUserMedia()` and completely ignores the configured RTSP URLs, making IP camera integration non-functional.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user adds an RTSP camera with a valid RTSP URL THEN the LiveCamera component does not display the stream from that camera

1.2 WHEN a user navigates to the camera management page with configured RTSP cameras THEN the camera preview shows a placeholder icon instead of the live stream

1.3 WHEN a user clicks "Start" on the LiveCamera component THEN the component attempts to access the browser's local camera via `getUserMedia()` instead of connecting to the configured RTSP stream

1.4 WHEN an RTSP camera is configured with credentials (username/password) THEN the credentials are embedded in the URL but never used to authenticate the stream connection

### Expected Behavior (Correct)

2.1 WHEN a user adds an RTSP camera with a valid RTSP URL THEN the LiveCamera component SHALL display the live stream from that RTSP camera

2.2 WHEN a user navigates to the camera management page with configured RTSP cameras THEN the camera preview SHALL show the live video feed from the RTSP stream

2.3 WHEN a user clicks "Start" on the LiveCamera component with an RTSP camera configured THEN the component SHALL connect to the RTSP stream and display the video feed

2.4 WHEN an RTSP camera is configured with credentials THEN the component SHALL use those credentials to authenticate the stream connection

2.5 WHEN the RTSP stream is unavailable or connection fails THEN the component SHALL display an error message indicating the connection failure

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user uses the browser camera (Quick Scan) without any RTSP camera configured THEN the component SHALL CONTINUE TO access the browser's local camera via `getUserMedia()`

3.2 WHEN a user has both browser camera and RTSP cameras available THEN the component SHALL CONTINUE TO allow switching between them

3.3 WHEN motion is detected in the video feed THEN the component SHALL CONTINUE TO trigger AI threat analysis

3.4 WHEN a threat is detected THEN the component SHALL CONTINUE TO display threat analysis results and recommendations

3.5 WHEN the user manually triggers a threat scan THEN the component SHALL CONTINUE TO capture the current frame and analyze it for threats
