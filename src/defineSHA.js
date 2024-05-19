import b4a from "b4a";
export const defineSha256 = async (data) =>
  await crypto.subtle.digest("SHA-256", b4a.from(data, "hex")).then(b4a.from);
