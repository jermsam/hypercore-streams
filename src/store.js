import RAM from "random-access-memory";
import Corestore from "corestore";

const storage = RAM.reusable();

export const store = new Corestore(storage);
