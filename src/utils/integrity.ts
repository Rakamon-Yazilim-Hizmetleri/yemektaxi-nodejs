/** request verification
 * device id gelen headerdan boşlukla le ayırıp al
 * şuanki zamanı mod 60 yap
 * currentTime - seconds yapıp dakikayı bul
 * deviceId+"_"+dakika diye key oluştur
 * keyi sha256 hashliyoz
 * hash i applerden gelen hashle karşılaştırıoz
 * yemezse dakikadan 60 çıkar bi dk öncesine git
 * aynı formatta hash oluştur onada bak
 * Integrity check failed.
 * X-Integrity: deviceId Hash
 */
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
