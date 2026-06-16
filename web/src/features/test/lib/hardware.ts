export interface DeviceInfo {
  name: string;
  type: 'screen-based' | 'portable';
  status: 'supported' | 'legacy' | 'incompatible';
  hz?: string;
  note?: string;
}

export const SUPPORTED_DEVICES: DeviceInfo[] = [
  { name: 'Tobii Pro Spectrum', type: 'screen-based', status: 'supported', hz: 'Up to 1200 Hz' },
  { name: 'Tobii Pro Fusion', type: 'screen-based', status: 'supported', hz: 'Up to 250 Hz' },
  { name: 'Tobii Pro Spark', type: 'screen-based', status: 'supported', hz: '60 Hz' },
  { name: 'Tobii Pro Nano', type: 'screen-based', status: 'supported', hz: '60 Hz' },
];

export const LEGACY_DEVICES: DeviceInfo[] = [
  { name: 'Tobii Pro X3-120', type: 'screen-based', status: 'legacy', hz: '120 Hz' },
  { name: 'Tobii Pro X2-60', type: 'screen-based', status: 'legacy', hz: '60 Hz' },
  { name: 'Tobii Pro X2-30', type: 'screen-based', status: 'legacy', hz: '30 Hz' },
  {
    name: 'Tobii Pro TX300',
    type: 'screen-based',
    status: 'legacy',
    hz: '300 Hz',
    note: 'Firmware >= 1.0.0',
  },
  { name: 'Tobii Pro T60 XL', type: 'screen-based', status: 'legacy', note: 'Firmware >= 2.0.0' },
  { name: 'Tobii T60 / T120', type: 'screen-based', status: 'legacy', note: 'Firmware >= 2.0.0' },
  { name: 'Tobii X60 / X120', type: 'screen-based', status: 'legacy', note: 'Firmware >= 2.0.0' },
];

export const INCOMPATIBLE_DEVICES: DeviceInfo[] = [
  {
    name: 'Tobii Eye Tracker 5',
    type: 'screen-based',
    status: 'incompatible',
    note: 'Consumer / gaming device',
  },
  {
    name: 'Tobii Eye Tracker 5L',
    type: 'screen-based',
    status: 'incompatible',
    note: 'Consumer / gaming device',
  },
  {
    name: 'Tobii Eye Tracker 4C',
    type: 'screen-based',
    status: 'incompatible',
    note: 'Consumer / gaming device',
  },
  {
    name: 'Tobii Pro Glasses 2',
    type: 'portable',
    status: 'incompatible',
    note: 'Wearable - not supported',
  },
  {
    name: 'Tobii Pro Glasses 3',
    type: 'portable',
    status: 'incompatible',
    note: 'Wearable - not supported',
  },
  { name: 'VR Headsets (all)', type: 'portable', status: 'incompatible', note: 'Not supported' },
];
