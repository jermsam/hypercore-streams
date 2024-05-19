import "./styles.css";
import b4a from "b4a";

import { core, getPublicKey, store } from "./store";

(async () => {
  const expected = ["hello", "world", "verden", "welt"];
  let writableStream;
  // write
  await (async () => {
    const publicKey = await getPublicKey();
    writableStream = core.createWriteStream({ live: true });
    for (const data of expected) {
      const encoded = b4a.from(data);
      console.log({ encoded });
      writableStream.write(encoded);
    }
    writableStream.end();
    document.getElementById("app").innerHTML = `
    <h1>INPUT: ${JSON.stringify(expected)}</h1>
    `;
  })();

  await (async () => {
    await new Promise((resolve) => writableStream.on("finish", resolve));
  })();

  //read
  await (async () => {
    const publicKey = await getPublicKey();

    const readerCore = store.get(publicKey);
    await readerCore.ready();
    const readableStream = readerCore.createReadStream();
    let bucket = [];
    for await (const data of readableStream) {
      const decoded = b4a.toString(data);
      console.log({ decoded: decoded.toString() });
      bucket.push(decoded);
    }
    const output = document.createElement("div");
    output.innerHTML = `
    <h1>OUTPUT: ${JSON.stringify(bucket)}</h1>
    `;
    document.getElementById("app").appendChild(output);
  })();
})();
