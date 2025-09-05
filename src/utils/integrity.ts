import { createHash } from "crypto";

/**
 * Returns the current UNIX timestamp.
 *
 * @returns {Number}
 */
function unixTimestamp() {
  return Math.floor(Date.now() / 1000);
}
const checkIntegrity = (header: string) => {
  const [deviceId, hash] = header.split(" ");

  const timestamp = unixTimestamp();
  const seconds = timestamp % 60;
  let minutes = timestamp - seconds;
  let serverHash = createHash("sha256")
    .update(`${deviceId}_${minutes}`)
    .digest("hex");
  if (hash === serverHash) return true;
  minutes = minutes - 60;
  serverHash = createHash("sha256")
    .update(`${deviceId}_${minutes}`)
    .digest("hex");
  return hash === serverHash;
};

export default checkIntegrity;
