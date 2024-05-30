
let frame_counter = 0;

// Create a VideoEncoder


const encoder = new VideoEncoder({
  output: (chunk) => {
    // Send encoded chunk to main thread
    self.postMessage({ type: 'encodedChunk', chunk }, [chunk]);
  },
  error: (error) => {
    console.error('VideoEncoder error:', error);
  }
});

// Create a VideoDecoder
const decoder = new VideoDecoder({
  output: (frame) => {
    // Send decoded frame to main thread
    self.postMessage({ type: 'decodedFrame', frame }, [frame]);
  },
  error: (error) => {
    console.error('VideoDecoder error:', error);
  }
});


self.onmessage =  (event) => {
  const { data } = event;

  if(data.type === 'encode') {
    const config = data.config;
    encoder.configure(config);
    const frame = data.frame;
    if (encoder.encodeQueueSize > 2) {
      frame.close();
    } else {
      frame_counter++;
      const insert_keyframe = frame_counter % 150 === 0;
      encoder.encode(frame, { keyFrame: insert_keyframe });
      frame.close();
    }
  } else if (data.type === 'encodedChunk') {
    decoder.configure({
      codec: 'vp8'
    });

    const chunk = data.chunk;
    decoder.decode(new EncodedVideoChunk({
      type: chunk.type,
      timestamp: chunk.timestamp,
      data: chunk.data
    }));

  }


}






















// import InstrumentedTransformStream from './video-utils/InstrumentedTransformStream.mjs';
//
// onmessage = async (event) => {
//   if ((event.data.type = "sender")) {
//     const {
//       localFrameWritableStream,
//       localFrameReadableStream,
//     } = event.data.streams;
//
//     const EncodeTransformer  = new InstrumentedTransformStream({
//         start(controller){
//
//         },
//       transform(chunk, controller) {
//           controller.enqueue(chunk);
//       }
//     });
//
//     const DecodeTransformer  = new TransformStream({
//       start(controller){
//
//       },
//       transform(chunk, controller) {
//         controller.enqueue(chunk);
//       }
//     });
//
//     localFrameReadableStream
//       .pipeThrough(EncodeTransformer)
//       .pipeThrough(DecodeTransformer)
//       .pipeTo(localFrameWritableStream)
//
//     console.log(event.data);
//   }
// };
