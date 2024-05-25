import "./styles.css";
import b4a from "b4a";
import InstrumentedTransformStream from "./video-utils/InstrumentedTransformStream.mjs";

import { videocore, getPublicKey, store } from "./store";
import { getVideoStream } from "./video-utils/generators.mjs";

const inputput = document.getElementById("inputvideo");

(async () => {
  const senderWorker = new Worker(new URL("worker.mjs", import.meta.url), {
    type: "module",
  });

  const config = {
    codec: "vp8",
    width: 640,
    height: 480,
    bitrate: 2_000_000, // 2 Mbps
    framerate: 30,
  };

  // write
  await (async () => {
    const stream = await getVideoStream();
    const videoTrack = stream.getVideoTracks()[0];
    const videoTrackProcessor = new MediaStreamTrackProcessor({
      track: videoTrack,
    });

    let localFramesToClose = {};
    const readableStreamFromTrackProcessor = videoTrackProcessor.readable;

    const localFramesToCloseTramsformer = new InstrumentedTransformStream({
      transform(videoFrame, controller) {
        const timestamp = videoFrame.timestamp;
        localFramesToClose[timestamp] = videoFrame;
        controller.enqueue(videoFrame);
      },
    });

    // set the local frame
    readableStreamFromTrackProcessor.pipeThrough(localFramesToCloseTramsformer);

    // We need to encode it so we can append it to a hypercore that we can replicate over a hyperswarm and thus decode it.
    // ... but better to do this in another thread.

    const localFrameWritableStream = localFramesToCloseTramsformer.writable;
    const localFrameReadableStream = localFramesToCloseTramsformer.readable;

    senderWorker.postMessage({
      type: "sender",
      config,
    });
    // senderWorker.postMessage(
    //   {
    //     type: "process",
    //     config,
    //     streams: {
    //       localFrameWritableStream,
    //       localFrameReadableStream,
    //     },
    //   },
    //   [localFrameWritableStream, localFrameReadableStream, config],
    // );

    // close frame transformer
    const closeLocalFrameTramsformer = new InstrumentedTransformStream({
      transform(videoFrame, controller) {
        const timestamp = videoFrame.timestamp;
        const inputFrame = localFramesToClose[timestamp];
        if (inputFrame) {
          if (inputFrame !== videoFrame) {
            inputFrame.close();
          }
          delete inputFrame;
        }
        controller.enqueue(videoFrame);
      },
    });

    const trackGenerator = new MediaStreamTrackGenerator({ kind: "video" });

    // close local frame
    localFrameReadableStream
      .pipeThrough(closeLocalFrameTramsformer)
      .pipeTo(trackGenerator.writable);

    inputput.srcObject = new MediaStream([trackGenerator]);

    // const { supported } = await VideoEncoder.isConfigSupported(config);
    // writableStream = videocore.createWriteStream({ live: true });

    // let encoder;
    // if (supported) {
    //   encoder = new VideoEncoder({
    //     output: (chunk, metadata) => {
    //       // console.log({ chunk: chunk.byteLength });
    //       // actual bytes of encoded data
    //       const chunkData = new Uint8Array(chunk.byteLength);
    //       chunk.copyTo(chunkData);

    //       // Write to writableStream
    //       writableStream.write(chunkData);
    //     },
    //     error: (e) => {
    //       console.log(e.message);
    //     },
    //   });
    //   encoder.configure(config);
    // } else {
    //   // Try another config.
    // }
    // if (stream) {
    //   // document.getElementById("inputvideo").srcObject = stream;
    //   await processVideoStream(stream, encoder);
    // }
  })();

  // await (async () => {
  //   await new Promise((resolve) => writableStream.on("finish", resolve));
  // })();

  //read
  await (async () => {
    const publicKey = await getPublicKey(videocore);
    console.log("sss");
    const readerCore = store.get(publicKey);
    await readerCore.ready();
    const readableStream = readerCore.createReadStream();
    let bucket = [];
    // for await (const data of readableStream) {
    //   console.log({ data });
    //   // const decoded = b4a.toString(data);
    //   // console.log({ decoded: decoded.toString() });
    //   // bucket.push(decoded);
    // }
    const output = document.getElementById("outputvideo");
  })();
})();
