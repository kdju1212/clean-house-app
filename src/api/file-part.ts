import { File } from "expo-file-system";

/**
 * Expo's fetch/FormData polyfill (installed globally since SDK 57) dropped
 * support for React Native's old {uri,name,type} shape as a file field —
 * it throws "Unsupported FormDataPart implementation" now. It only accepts
 * a real Blob or an object exposing .bytes(). This reads the picked file's
 * bytes and wraps them with the filename/mime type the caller intends,
 * rather than whatever expo-file-system would infer from the raw cache path.
 */
export async function toFormDataFilePart(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<Blob> {
  const bytes = await new File(file.uri).bytes();
  return { name: file.name, type: file.type, bytes: async () => bytes } as unknown as Blob;
}
