import { calibrationLogger } from '../debug-config';
import type { FaceLandmarker } from './types';

type VisionTasksModule = {
  FaceLandmarker: {
    createFromOptions: (
      filesetResolver: unknown,
      options: {
        baseOptions: { modelAssetPath: string; delegate: 'GPU' | 'CPU' };
        runningMode: 'VIDEO';
        numFaces: number;
        outputFaceBlendshapes: boolean;
        outputFacialTransformationMatrixes: boolean;
      },
    ) => Promise<unknown>;
  };
  FilesetResolver: {
    forVisionTasks: (wasmPath: string) => Promise<unknown>;
  };
};

export const MEDIAPIPE_VERSION = process.env.NEXT_PUBLIC_MEDIAPIPE_VERSION ?? '0.10.32';
export const MEDIAPIPE_MODEL_URL =
  process.env.NEXT_PUBLIC_MEDIAPIPE_MODEL_URL ??
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
export const WEBCAM_WIDTH = Number(process.env.NEXT_PUBLIC_WEBCAM_WIDTH) || 640;
export const WEBCAM_HEIGHT = Number(process.env.NEXT_PUBLIC_WEBCAM_HEIGHT) || 480;

async function loadVisionTasksModule(): Promise<VisionTasksModule> {
  try {
    return (await import('@mediapipe/tasks-vision')) as VisionTasksModule;
  } catch (localErr) {
    const cdnUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
    const cdnMod = (await import(/* webpackIgnore: true */ cdnUrl)) as VisionTasksModule;

    calibrationLogger.warn(
      '[MediaPipe] Falling back to CDN bundle after local chunk-load failure.',
      localErr,
    );
    return cdnMod;
  }
}

function faceLandmarkerOptions(delegate: 'GPU' | 'CPU') {
  return {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_MODEL_URL,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  };
}

export async function createFaceLandmarker(): Promise<FaceLandmarker> {
  const vision = await loadVisionTasksModule();
  const { FaceLandmarker: FL, FilesetResolver } = vision;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
  );

  try {
    return await FL.createFromOptions(
      filesetResolver,
      faceLandmarkerOptions('GPU'),
    ) as FaceLandmarker;
  } catch (gpuErr) {
    calibrationLogger.warn(
      'GPU acceleration failed for FaceLandmarker, falling back to CPU.',
      gpuErr,
    );
    return await FL.createFromOptions(
      filesetResolver,
      faceLandmarkerOptions('CPU'),
    ) as FaceLandmarker;
  }
}
