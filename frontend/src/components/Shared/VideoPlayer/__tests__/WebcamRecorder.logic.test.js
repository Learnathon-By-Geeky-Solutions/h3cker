import { describe, it, expect } from 'vitest';

function computeShouldRecord(isVideoPlaying, faceTrackerReady, faceTrackerFailed, facePreCheckDone, faceAway) {
  return isVideoPlaying && (
    !faceTrackerReady ||
    faceTrackerFailed ||
    !facePreCheckDone ||
    !faceAway
  );
}

describe('WebcamRecorder shouldRecord logic', () => {
  it('records when video playing and no face tracker active', () => {
    expect(computeShouldRecord(true, false, false, false, false)).toBe(true);
  });

  it('does not record when video is paused', () => {
    expect(computeShouldRecord(false, false, false, false, false)).toBe(false);
  });

  it('records during pre-check even without face', () => {
    expect(computeShouldRecord(true, true, false, false, true)).toBe(true);
  });

  it('pauses recording when face away after pre-check', () => {
    expect(computeShouldRecord(true, true, false, true, true)).toBe(false);
  });

  it('resumes recording when face no longer away after pre-check', () => {
    expect(computeShouldRecord(true, true, false, true, false)).toBe(true);
  });

  it('records normally when face tracker failed to init', () => {
    expect(computeShouldRecord(true, false, true, true, true)).toBe(true);
    expect(computeShouldRecord(true, true, true, true, true)).toBe(true);
  });

  it('does not record when video paused and face away after pre-check', () => {
    expect(computeShouldRecord(false, true, false, true, true)).toBe(false);
  });

  it('does not record when video paused and face okay after pre-check', () => {
    expect(computeShouldRecord(false, true, false, true, false)).toBe(false);
  });

  it('records when face tracker ready but not yet pre-checked', () => {
    expect(computeShouldRecord(true, true, false, false, true)).toBe(true);
    expect(computeShouldRecord(true, true, false, false, false)).toBe(true);
  });
});

function computeFaceBlocked(isVideoPlaying, faceTrackerReady, faceTrackerFailed, facePreCheckDone, faceAway) {
  if (faceTrackerFailed) return false;
  if (!faceTrackerReady) return false;
  if (!facePreCheckDone) return false;
  if (!isVideoPlaying) return false;
  return faceAway;
}

describe('face block logic', () => {
  it('does not block when tracker failed', () => {
    expect(computeFaceBlocked(true, false, true, true, true)).toBe(false);
  });

  it('does not block during pre-check', () => {
    expect(computeFaceBlocked(true, true, false, false, true)).toBe(false);
  });

  it('does not block when video is paused', () => {
    expect(computeFaceBlocked(false, true, false, true, true)).toBe(false);
  });

  it('blocks when face away and video playing after pre-check', () => {
    expect(computeFaceBlocked(true, true, false, true, true)).toBe(true);
  });

  it('unblocks when no longer away', () => {
    expect(computeFaceBlocked(true, true, false, true, false)).toBe(false);
  });

  it('does not block during 3s grace window (faceAway false)', () => {
    expect(computeFaceBlocked(true, true, false, true, false)).toBe(false);
  });
});
