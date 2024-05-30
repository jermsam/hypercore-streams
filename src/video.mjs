import "./styles.css";
import b4a from 'b4a'
import { serialize, deserialize } from 'bson'

import { getPublicKey, store, core} from './store';

const localVideo = document.getElementById("localVideo");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");


const remoteVideo = document.getElementById("remoteVideo");
const startRemote = document.getElementById("startRemote");
const stopRemote = document.getElementById("stopRemote");

document.addEventListener('DOMContentLoaded', () => {
  let track;
  // const bson = new BSON();
  let remoteTrack;

  function encodeChunk(chunk) {
    const { type, timestamp, duration, byteLength } = chunk;
    const data = new Uint8Array(byteLength); // Create a new Uint8Array
    chunk.copyTo(data); // Copy data from the chunk to the array
    const bsonData = {
      type,
      timestamp,
      duration,
      byteLength,
      data: b4a.from(data.buffer)  // Convert ArrayBuffer to Buffer
    };

    return b4a.from(serialize(bsonData)); // Serialize to BSON and then to Buffer
  }
  //
  function decodeChunk(encoded) {
    const bsonData = deserialize(b4a.toBuffer(encoded)); // Deserialize BSON to object
    const { type, timestamp, duration, byteLength, data } = bsonData;
    const arrayBuffer = data.buffer; // Convert Buffer back to ArrayBuffer
    const decodedBsonData = {
      type,
      timestamp,
      duration,
      byteLength,
      data: arrayBuffer  // Convert ArrayBuffer to Buffer
    };
    return new EncodedVideoChunk(decodedBsonData);
  }

  // click start button
  startButton.addEventListener("click", async () => {
    // read from webcam
    const stream = await navigator.mediaDevices.getUserMedia({video: true})
    const [firstTrack] = stream.getVideoTracks();
    track = firstTrack;

    const mediaProcessor = new MediaStreamTrackProcessor({track});

    const inputStream = mediaProcessor.readable;


    const mediaGenerator = new MediaStreamTrackGenerator({kind: 'video'})
    const outputStream = mediaGenerator.writable;


    // Create the TransformStream for encoding
    const encoderTransformStream = new TransformStream({
      start(controller) {
        this.frame_counter = 0;
        this.encoder = new VideoEncoder({
          output: (chunk) => {
            // const { type, timestamp, data } = chunk;
            // console.log(timestamp);
            const encoded = encodeChunk(chunk)
              core.append(encoded)
            controller.enqueue(encoded);
          },
          error: (error) => {
            console.error('VideoEncoder error:', error);
          }
        });

        this.encoder.configure({
          codec: 'vp8',
          width: track.getSettings().width,
          height: track.getSettings().height,
          bitrate: 1_000_000,
          framerate: 30,
        });
      },
      async transform(frame, controller) {
        if (this.encoder.encodeQueueSize > 2) {
          frame.close();
        } else {
          this.frame_counter++;
          const insert_keyframe = this.frame_counter % 150 === 0;
          this.encoder.encode(frame, { keyFrame: insert_keyframe });
          frame.close();
        }
      },
      flush() {
        this.encoder.flush();
      }
    });

    // Create the TransformStream for decoding
    const decoderTransformStream = new TransformStream({
      start(controller) {
        this.decoder = new VideoDecoder({
          output: (frame) => {

            controller.enqueue(frame);
          },
          error: (error) => console.error('VideoDecoder error:', error)
        });

        this.decoder.configure({ codec: 'vp8' });
      },
      async transform(chunk, controller) {
        const decoded = decodeChunk(chunk);
        this.decoder.decode(decoded);
      }
    });

    inputStream
      .pipeThrough(encoderTransformStream)
      .pipeThrough(decoderTransformStream)
      .pipeTo(outputStream);

    localVideo.srcObject = new MediaStream([mediaGenerator])

  })


  // click stop button
  stopButton.addEventListener("click", () => {
    if(track) {
      track.stop();
    }
  })

  startRemote.addEventListener("click", async () => {
    const streamTransformer = new TransformStream({
      async start(controller) {
        const publicKey = await getPublicKey();
        const readerCore = store.get(publicKey);
        await readerCore.ready();

        const xReadable = readerCore.createReadStream({ live: true });

        // Use TransformStream's internal functionality directly
        xReadable.on('data', (chunk) => {
          console.log({ chunk });
          controller.enqueue(chunk);
        });

        xReadable.once('error', (error) => {
          console.error('Stream error:', error);
          controller.error(error); // Propagate error to TransformStream
        });

        xReadable.once('end', () => {
          controller.close();
        });
      },
      transform(chunk, controller) {
        // No transformation needed, directly enqueue
        controller.enqueue(chunk);
      }
    });;

    const decoderTransformStream = new TransformStream({
      start(controller) {
        this.decoder = new VideoDecoder({
          output: (frame) => {

            controller.enqueue(frame);
          },
          error: (error) => console.error('VideoDecoder error:', error)
        });

        this.decoder.configure({ codec: 'vp8' });
      },
      async transform(chunk, controller) {
        const decoded = decodeChunk(chunk);
        this.decoder.decode(decoded);
      }
    });

    const remoteInput = streamTransformer.readable.pipeThrough(decoderTransformStream)

    const mediaGenerator = new MediaStreamTrackGenerator({kind: 'video'})
    remoteTrack = mediaGenerator
    const outputStream = mediaGenerator.writable;
    remoteInput.pipeTo(outputStream)
    remoteVideo.srcObject = new MediaStream([mediaGenerator])
  })

  stopRemote.addEventListener("click", async () => {
    if(remoteTrack) {
      remoteTrack.stop()
    }
  })
})




