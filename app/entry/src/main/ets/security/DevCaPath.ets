// Writes the public development CA PEM into the app sandbox so @ohos.net.http
// can use it via HttpRequestOptions.caPath. No private key is written here.
import fileIo from '@ohos.file.fs';
import { util } from '@kit.ArkTS';
import { common } from '@kit.AbilityKit';
import { DEV_CA_PEM } from './DevCa';

export function ensureDevCaFile(context: common.UIAbilityContext): string {
  const path: string = context.filesDir + '/dsh-harmony-dev-ca.pem';
  const file: fileIo.File = fileIo.openSync(
    path,
    fileIo.OpenMode.WRITE_ONLY | fileIo.OpenMode.CREATE | fileIo.OpenMode.TRUNC
  );
  try {
    const data: Uint8Array = new util.TextEncoder().encodeInto(DEV_CA_PEM);
    fileIo.writeSync(file.fd, data.buffer);
  } finally {
    fileIo.closeSync(file);
  }
  return path;
}
