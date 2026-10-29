import { boundedBody, HttpError } from "./http"

export const artifactManifestLimit = 30 * 1024 * 1024

/** SDK encoding:none transfers raw bytes as a stream, never a buffered string. */
export async function readArtifactManifest(
  artifact: { size: number; content: ReadableStream<Uint8Array> },
  limit = artifactManifestLimit
) {
  if (!Number.isSafeInteger(artifact.size) || artifact.size < 0 || artifact.size > limit) {
    await artifact.content.cancel()
    throw new HttpError(413, "artifact_too_large", "Artifact manifest exceeds its transfer limit.")
  }
  // Size is advisory: the creator's processes can change the file during transfer.
  // Count the actual stream and cancel on overflow before parsing any JSON.
  return boundedBody({ headers: new Headers(), body: artifact.content }, limit)
}
