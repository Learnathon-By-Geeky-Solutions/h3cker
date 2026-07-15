import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const DEFAULTS = {
  checkIntervalMs: 150,
  preCheckTimeoutMs: 5000,
  awayTimeoutMs: 3000,
  eyeOpenThreshold: 0.05,
  requiredConfidence: 0.5,
};

export class FaceTracker {
  constructor(options = {}) {
    this.opts = { ...DEFAULTS, ...options };
    this.faceLandmarker = null;
    this._running = false;
    this._animFrameId = null;
    this._lastFaceDetectedTime = 0;
    this._awayReported = false;
    this._onResult = null;
    this._videoEl = null;
    this._ready = false;
    this._initError = null;
    this._hasWebGL = false;
    this._lastTimestamp = 0;
  }

  get isReady() {
    return this._ready;
  }

  get initError() {
    return this._initError;
  }

  _checkWebGL() {
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  async init() {
    this._hasWebGL = this._checkWebGL();
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      this.faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: this._hasWebGL ? 'GPU' : 'CPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: this.opts.requiredConfidence,
        minTrackingConfidence: 0.5,
      });
      this._ready = true;
      return true;
    } catch (err) {
      this._initError = err;
      console.warn('[FaceTracker] init failed:', err.message);
      return false;
    }
  }

  _detect(timestamp) {
    if (!this.faceLandmarker || !this._videoEl || this._videoEl.readyState < 2) {
      return null;
    }
    const result = this.faceLandmarker.detectForVideo(this._videoEl, timestamp);
    return this._processResult(result, timestamp);
  }

  _processResult(result, timestamp) {
    const hasFace = Boolean(result.faceLandmarks && result.faceLandmarks.length > 0);

    let eyesOpen = false;
    let headCentered = false;

    if (hasFace && result.faceBlendshapes && result.faceBlendshapes.length > 0) {
      const cats = result.faceBlendshapes[0].categories;
      const leftBlink = cats.find(c => c.categoryName === 'eyeBlinkLeft')?.score ?? 0;
      const rightBlink = cats.find(c => c.categoryName === 'eyeBlinkRight')?.score ?? 0;
      eyesOpen = (1 - leftBlink) > this.opts.eyeOpenThreshold &&
                 (1 - rightBlink) > this.opts.eyeOpenThreshold;
    }

    if (hasFace && result.faceLandmarks[0]) {
      const noseX = result.faceLandmarks[0][1].x;
      headCentered = noseX > 0.3 && noseX < 0.7;
    }

    if (hasFace) {
      this._lastFaceDetectedTime = timestamp;
      this._awayReported = false;
    }

    const faceCriteriaMet = hasFace && eyesOpen && headCentered;

    return { hasFace, eyesOpen, headCentered, faceCriteriaMet, timestamp };
  }

  start(videoEl, onResult) {
    if (this._running) this.stop();
    this._running = true;
    this._videoEl = videoEl;
    this._onResult = onResult;
    this._lastFaceDetectedTime = performance.now();
    this._awayReported = false;

    const loop = () => {
      if (!this._running) return;
      const ts = performance.now();
      const result = this._detect(ts);
      if (result && this._onResult) {
        this._onResult(result);
      }
      this._animFrameId = requestAnimationFrame(loop);
    };
    this._animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this._onResult = null;
    this._videoEl = null;
  }

  destroy() {
    this.stop();
    if (this.faceLandmarker) {
      try { this.faceLandmarker.close(); } catch (e) { console.warn('[FaceTracker] close error:', e); }
      this.faceLandmarker = null;
    }
    this._ready = false;
  }

  isAway(timestamp) {
    return !this._running || (timestamp - this._lastFaceDetectedTime > this.opts.awayTimeoutMs);
  }

  getBlinkRate(history) {
    if (!history || history.length < 2) return 0;
    let blinks = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].eyesOpen === false && history[i - 1].eyesOpen === true) {
        blinks++;
      }
    }
    const duration = (history[history.length - 1].timestamp - history[0].timestamp) / 1000;
    return duration > 0 ? blinks / duration : 0;
  }
}

let _singleton = null;

export async function getFaceTracker(options) {
  if (!_singleton) {
    _singleton = new FaceTracker(options);
  }
  return _singleton;
}

export function resetFaceTracker() {
  if (_singleton) {
    _singleton.destroy();
    _singleton = null;
  }
}
