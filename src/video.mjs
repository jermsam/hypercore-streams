import "./styles.css";
import b4a from "b4a";

import { videocore, getPublicKey, store } from "./store";
import {
  getVideoStream,
  processVideoStream,
} from "./video-utils/generators.mjs";

(async () => {
  let writableStream;
  // write
  await (async () => {
    const stream = await getVideoStream();

    const config = {
      codec: "vp8",
      width: 640,
      height: 480,
      bitrate: 2_000_000, // 2 Mbps
      framerate: 30,
    };

    const { supported } = await VideoEncoder.isConfigSupported(config);
    writableStream = videocore.createWriteStream({ live: true });

    let encoder;
    if (supported) {
      encoder = new VideoEncoder({
        output: (chunk, metadata) => {
          // console.log({ chunk: chunk.byteLength });
          // actual bytes of encoded data
          const chunkData = new Uint8Array(chunk.byteLength);
          chunk.copyTo(chunkData);

          // Write to writableStream
          writableStream.write(chunkData);
        },
        error: (e) => {
          console.log(e.message);
        },
      });
      encoder.configure(config);
    } else {
      // Try another config.
    }
    if (stream) {
      // document.getElementById("inputvideo").srcObject = stream;
      await processVideoStream(stream, encoder);
    }
  })();

  await (async () => {
    await new Promise((resolve) => writableStream.on("finish", resolve));
  })();

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
