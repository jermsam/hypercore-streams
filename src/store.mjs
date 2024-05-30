import RAM from "random-access-memory";
import Corestore from "corestore";

const storage = RAM.reusable();

export const store = new Corestore(storage);

export const core = store.get({ name: "test stream" });

export const videocore = store.get({ name: "video stream" });

export const getPublicKey = async () => {
  await core.ready();
  return core.keyPair.publicKey;
};
