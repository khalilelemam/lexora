import { fitProductionCalibrationModel, type TrainingSample } from '../src/features/test/lib/calibration-models';

// Build synthetic training samples
function makeSample(ix: number, iy: number, invHeadZ: number): TrainingSample {
  return {
    ix,
    iy,
    yaw: 0,
    pitch: 0,
    roll: 0,
    headX: 0,
    headY: 0,
    invHeadZ,
    targetX: ix * 1920,
    targetY: iy * 1080,
    pointIndex: 0,
    sampleWeight: 1.0,
    phase: 'STATIC',
  } as TrainingSample;
}

const samples: TrainingSample[] = [];
for (let i = 0; i < 40; i++) {
  const ix = 0.2 + 0.6 * Math.random();
  const iy = 0.2 + 0.6 * Math.random();
  const invHeadZ = 1.2 + Math.random() * 0.6; // around 1.5
  samples.push(makeSample(ix, iy, invHeadZ));
}

const model = fitProductionCalibrationModel(samples, []);
console.log('Model info:', model.info);

// Call predict as requested
console.log('Calling predict(0.5,0.5,0,0,0,0,0,1.5)');
const p = model.predict(0.5, 0.5, 0, 0, 0, 0, 0, 1.5);
console.log('Predict result:', p);
