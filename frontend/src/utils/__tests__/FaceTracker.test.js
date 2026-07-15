import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn(),
      close: vi.fn(),
    }),
  },
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
}));

import { FaceTracker } from '../FaceTracker';

function createMockBlendshapes(leftBlink = 0, rightBlink = 0) {
  return [{
    categories: [
      { categoryName: 'eyeBlinkLeft', score: leftBlink },
      { categoryName: 'eyeBlinkRight', score: rightBlink },
    ],
  }];
}

function createMockResult({
  hasFace = true,
  leftBlink = 0,
  rightBlink = 0,
  noseX = 0.5,
} = {}) {
  const result = {};
  if (hasFace) {
    result.faceLandmarks = [
      [{ x: 0 }, { x: noseX }, { x: 0 }, { x: 0 }, { x: 0 }],
    ];
    result.faceBlendshapes = createMockBlendshapes(leftBlink, rightBlink);
  } else {
    result.faceLandmarks = [];
  }
  return result;
}

describe('FaceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new FaceTracker({
      eyeOpenThreshold: 0.05,
      requiredConfidence: 0.5,
    });
  });

  describe('_processResult', () => {
    it('detects face present with eyes open and centered', () => {
      const result = createMockResult({ leftBlink: 0, rightBlink: 0, noseX: 0.5 });
      const processed = tracker._processResult(result, 1000);
      expect(processed).toMatchObject({
        hasFace: true,
        eyesOpen: true,
        headCentered: true,
        faceCriteriaMet: true,
      });
    });

    it('marks criteria false when eyes are closed', () => {
      const result = createMockResult({ leftBlink: 0.98, rightBlink: 0.98, noseX: 0.5 });
      const processed = tracker._processResult(result, 2000);
      expect(processed.eyesOpen).toBe(false);
      expect(processed.faceCriteriaMet).toBe(false);
    });

    it('marks criteria false when head is not centered (too far left)', () => {
      const result = createMockResult({ noseX: 0.1 });
      const processed = tracker._processResult(result, 3000);
      expect(processed.headCentered).toBe(false);
      expect(processed.faceCriteriaMet).toBe(false);
    });

    it('marks criteria false when head is not centered (too far right)', () => {
      const result = createMockResult({ noseX: 0.8 });
      const processed = tracker._processResult(result, 4000);
      expect(processed.headCentered).toBe(false);
      expect(processed.faceCriteriaMet).toBe(false);
    });

    it('handles no face in frame', () => {
      const result = createMockResult({ hasFace: false });
      const processed = tracker._processResult(result, 5000);
      expect(processed).toMatchObject({
        hasFace: false,
        eyesOpen: false,
        headCentered: false,
        faceCriteriaMet: false,
      });
    });

    it('handles missing blendshapes gracefully', () => {
      const result = {
        faceLandmarks: [[{ x: 0 }, { x: 0.5 }, { x: 0 }, { x: 0 }, { x: 0 }]],
      };
      const processed = tracker._processResult(result, 6000);
      expect(processed.hasFace).toBe(true);
      expect(processed.eyesOpen).toBe(false);
    });

    it('handles empty result gracefully', () => {
      const processed = tracker._processResult({}, 7000);
      expect(processed.hasFace).toBe(false);
      expect(processed.faceCriteriaMet).toBe(false);
    });

    it('validates nose at boundary 0.3 edge', () => {
      const result = createMockResult({ noseX: 0.3001 });
      const processed = tracker._processResult(result, 8000);
      expect(processed.headCentered).toBe(true);
    });

    it('validates nose at boundary 0.7 edge', () => {
      const result = createMockResult({ noseX: 0.6999 });
      const processed = tracker._processResult(result, 9000);
      expect(processed.headCentered).toBe(true);
    });

    it('detects eye open with one eye closed threshold', () => {
      const result = createMockResult({ leftBlink: 0, rightBlink: 0.98 });
      const processed = tracker._processResult(result, 10000);
      expect(processed.eyesOpen).toBe(false);
    });
  });

  describe('away tracking', () => {
    it('isAway returns true when no detection for awayTimeout', () => {
      tracker._running = true;
      tracker._lastFaceDetectedTime = 0;
      expect(tracker.isAway(10000)).toBe(true);
    });

    it('isAway returns false when detected recently', () => {
      tracker._running = true;
      tracker._lastFaceDetectedTime = 9700;
      expect(tracker.isAway(10000)).toBe(false);
    });

    it('isAway returns false when not running', () => {
      tracker._running = false;
      tracker._lastFaceDetectedTime = 0;
      expect(tracker.isAway(10000)).toBe(true);
    });
  });

  describe('blink rate', () => {
    it('returns 0 for empty history', () => {
      expect(tracker.getBlinkRate([])).toBe(0);
    });

    it('returns 0 for single entry', () => {
      expect(tracker.getBlinkRate([{ eyesOpen: true, timestamp: 1000 }])).toBe(0);
    });

    it('calculates blinks per second', () => {
      const history = [
        { eyesOpen: true, timestamp: 0 },
        { eyesOpen: false, timestamp: 500 },
        { eyesOpen: true, timestamp: 1000 },
        { eyesOpen: false, timestamp: 1500 },
        { eyesOpen: true, timestamp: 2000 },
      ];
      const rate = tracker.getBlinkRate(history);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeCloseTo(1, 0);
    });
  });

  describe('WebGL check', () => {
    it('detects WebGL support', () => {
      const canvasMock = {
        getContext: vi.fn().mockReturnValue({}),
      };
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(canvasMock);
      expect(tracker._checkWebGL()).toBe(true);
      document.createElement = originalCreateElement;
    });

    it('handles WebGL unavailable', () => {
      const canvasMock = {
        getContext: vi.fn().mockReturnValue(null),
      };
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(canvasMock);
      expect(tracker._checkWebGL()).toBe(false);
      document.createElement = originalCreateElement;
    });

    it('handles canvas creation failure', () => {
      document.createElement = vi.fn().mockImplementation(() => { throw new Error('no canvas'); });
      expect(tracker._checkWebGL()).toBe(false);
      document.createElement = document.createElement.bind(document);
    });
  });
});
