/**
 * In WebRTC contexts, the source of a video stream is usually
 * a MediaStreamTrack obtained from the camera through a call to getUserMedia,
 * or received from a peer.
 *
 * The MediaStreamTrackProcessor object (MSTP) can be used to convert the MediaStreamTrack to a stream of VideoFrame objects.
 *
 * Note: MediaStreamTrackProcessor is only exposed in worker contexts… in theory,
 * but Chrome currently exposes it on the main thread and only there.
 * */

// 1. Define constraints
const constraints = {
  video: true,
};

// 2. Get MediaStream from Camera
export async function getVideoStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      ...constraints,
    });
    return stream;
  } catch (error) {
    console.error("Error getting video stream:", error);
    // Handle the error appropriately (e.g., display an error message to the user)
  }
}

// 3. Get MediaStreamTrack from MediaStream (moved inside getVideoStream)
// 4. Create MediaStreamTrackProcessor (moved inside processVideoStream)

let frameFromCamera = null;
let frameCounter = 0;

export async function processVideoStream(stream, encoder) {
  const track = stream.getTracks()[0];
  const trackProcessor = new MediaStreamTrackProcessor(track);
  const reader = trackProcessor.readable.getReader();

  // 5. Use MediaStreamTrackProcessor to process VideoFrame objects
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;

      // Update the latest frame
      frameFromCamera = result.value;

      // Process the frame (e.g., display it on a canvas)
      if (encoder) {
        if (encoder.encodeQueueSize > 2) {
          // Too many frames in flight, encoder is overwhelmed
          // let's drop this frame.
          frameFromCamera.close();
        } else {
          frameCounter++;
          const keyFrame = frameCounter % 150 === 0;
          encoder.encode(frameFromCamera, { keyFrame });
          frameFromCamera.close();
        }
      } else {
        console.log("New Video Frame received:", frameFromCamera);
      }
      // Ensure proper closing of the frame (important!)
      frameFromCamera.close();
    }
  } finally {
    // Ensure reader is closed even if there's an error
    reader.releaseLock();
  }
}

/**
 * The MediaStreamTrackProcessor object (MSTP) can be used to convert the MediaStreamTrack to a stream of VideoFrame objects.
 * That said, it is fairly inefficient to transport raw decoded frames given their size.
 */
