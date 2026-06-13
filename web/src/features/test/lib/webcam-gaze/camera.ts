import { WEBCAM_HEIGHT, WEBCAM_WIDTH } from './mediapipe';

export async function startWebcamStream(videoElement: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: WEBCAM_WIDTH },
      height: { ideal: WEBCAM_HEIGHT },
      facingMode: 'user',
    },
  });

  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}

export function stopWebcamStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function cameraErrorMessage(err: unknown): string {
  return err instanceof DOMException && err.name === 'NotAllowedError'
    ? 'Camera permission denied. Please allow camera access in your browser settings.'
    : 'Failed to access camera. Make sure your camera is connected and not in use.';
}
