import "./styles.css";
import { defineSha256 } from "./defineSHA";
import { store } from "./store";

(async () => {
  const topic = await defineSha256("test stream");
  const core = store.get(topic);
  const writableStream = core.createWriteStream();
  document.getElementById("app").innerHTML = `
    <h1>Hiii ${core.writable}</h1>

    `;
})();
