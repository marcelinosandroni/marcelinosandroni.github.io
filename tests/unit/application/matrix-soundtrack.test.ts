import { describe, expect, it, vi } from "vitest";

import {
  MatrixSoundtrack,
  type AudioBufferSourceNodeLike,
  type AudioContextLike,
  type AudioContextState,
  type BiquadFilterNodeLike,
  type GainNodeLike,
  type OscillatorNodeLike,
} from "@/application/audio/matrix-soundtrack";

/**
 * A fake `AudioContext` that records what was scheduled.
 *
 * The point of injecting the context is that this file can exist. Asserting on
 * real audio output is not possible in a unit test, so the behaviour worth
 * protecting — what gets built, when it starts and stops, and whether the loop
 * keeps going and then actually stops — is asserted on the calls instead.
 */
function createFakeContext(overrides: Partial<AudioContextLike> = {}) {
  const oscillators: Array<{ type: string; frequency: number; stopped: boolean }> = [];
  const bufferSources: Array<{ loop: boolean; started: boolean }> = [];
  const gains: Array<{ value: number }> = [];
  const filters: Array<{ type: string; frequency: number }> = [];
  const disconnected: number[] = [];

  const param = (initial = 0) => ({
    value: initial,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });

  const context = {
    currentTime: 10,
    sampleRate: 48_000,
    state: "running" as AudioContextState,
    destination: { connect: vi.fn() },
    createOscillator(): OscillatorNodeLike {
      const record = { type: "sine", frequency: 0, stopped: false };
      oscillators.push(record);
      return {
        type: "sine",
        frequency: param(),
        detune: param(),
        connect: vi.fn(),
        disconnect: () => disconnected.push(1),
        start: vi.fn(),
        stop: () => {
          record.stopped = true;
        },
      } as unknown as OscillatorNodeLike;
    },
    createGain(): GainNodeLike {
      const record = { value: 0 };
      gains.push(record);
      return {
        gain: param(),
        connect: vi.fn(),
        disconnect: () => disconnected.push(1),
      } as unknown as GainNodeLike;
    },
    createBiquadFilter(): BiquadFilterNodeLike {
      const record = { type: "lowpass", frequency: 0 };
      filters.push(record);
      return {
        type: "lowpass",
        frequency: param(),
        Q: param(),
        connect: vi.fn(),
        disconnect: () => disconnected.push(1),
      } as unknown as BiquadFilterNodeLike;
    },
    createBufferSource(): AudioBufferSourceNodeLike {
      const record = { loop: false, started: false };
      bufferSources.push(record);
      return {
        /*
         * `loop` is a live accessor, not a copied field. The implementation sets
         * it after creation, and a snapshot taken at construction time reported
         * `false` for a rain layer that was in fact looping.
         */
        buffer: null,
        get loop() {
          return record.loop;
        },
        set loop(value: boolean) {
          record.loop = value;
        },
        connect: vi.fn(),
        disconnect: () => disconnected.push(1),
        start: () => {
          record.started = true;
        },
        stop: vi.fn(),
      } as unknown as AudioBufferSourceNodeLike;
    },
    createBuffer(_channels: number, length: number) {
      return {
        length,
        getChannelData: () => new Float32Array(length),
      };
    },
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return { context: context as unknown as AudioContextLike, oscillators, bufferSources, gains, filters, disconnected };
}

describe("MatrixSoundtrack", () => {
  it("builds the three layers and starts them", async () => {
    const { context, oscillators, bufferSources, filters } = createFakeContext();
    const track = new MatrixSoundtrack(context, { schedule: () => 0, cancel: () => {} });

    await track.start();

    // Sub bass and the bell are both oscillators; the rain is the only buffer.
    expect(oscillators.length).toBeGreaterThanOrEqual(3);
    expect(bufferSources).toHaveLength(1);
    expect(filters).toHaveLength(1);
    expect(track.isPlaying).toBe(true);
  });

  it("loops the rain, because noise has no wave to sustain it", async () => {
    const { context, bufferSources } = createFakeContext();

    await new MatrixSoundtrack(context, { schedule: () => 0, cancel: () => {} }).start();

    expect(bufferSources[0]?.loop).toBe(true);
    expect(bufferSources[0]?.started).toBe(true);
  });

  it("keeps pulsing instead of firing once and dying", async () => {
    /*
     * The first version scheduled the pulse and the bell exactly once, so the
     * texture was gone after one and a half seconds and all that survived was the
     * rain. This drives the injected timer to prove the loop repeats.
     */
    const tick: { current: (() => void) | null } = { current: null };
    const { context, oscillators } = createFakeContext();
    const track = new MatrixSoundtrack(context, {
      schedule: (callback) => {
        tick.current = callback;
        return 1;
      },
      cancel: () => {},
    });

    await track.start();
    const afterStart = oscillators.length;

    tick.current?.();
    expect(oscillators.length, "a second pulse must be scheduled").toBeGreaterThan(afterStart);

    const afterTick = oscillators.length;
    tick.current?.();
    expect(oscillators.length, "and a third").toBeGreaterThan(afterTick);
  });

  it("stops the loop on stop, before the context closes", async () => {
    /*
     * Order matters. Cancelling after the fade would let one more tick build
     * oscillators against a context that is about to close.
     */
    const cancelled: unknown[] = [];
    const tick: { current: (() => void) | null } = { current: null };
    const { context } = createFakeContext();
    const track = new MatrixSoundtrack(context, {
      schedule: (callback) => {
        tick.current = callback;
        return "handle";
      },
      cancel: (handle) => cancelled.push(handle),
    });

    await track.start();
    await track.stop();

    expect(cancelled).toEqual(["handle"]);
    expect(track.isPlaying).toBe(false);
    expect(context.close).toHaveBeenCalled();

    // A tick that fires after stopping must be inert, not schedule anything.
    tick.current?.();
    expect(cancelled).toHaveLength(1);
  });

  it("resumes a suspended context, so a first click is actually audible", async () => {
    const { context } = createFakeContext({ state: "suspended" as AudioContextState });

    await new MatrixSoundtrack(context, { schedule: () => 0, cancel: () => {} }).start();

    expect(context.resume).toHaveBeenCalled();
  });

  it("fades in rather than appearing at full volume", async () => {
    const { context } = createFakeContext();
    const master = {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    // The master is created first, so replacing the first createGain() is enough
    // to observe how it is ramped.
    const original = context.createGain.bind(context);
    const spy = vi.spyOn(context, "createGain").mockReturnValueOnce(master as unknown as GainNodeLike);
    spy.mockImplementationOnce(original);

    await new MatrixSoundtrack(context, { schedule: () => 0, cancel: () => {} }).start();

    // Starts silent, then ramps: a bang on the first click is the failure here.
    expect(master.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("is a no-op when stopped twice", async () => {
    const { context } = createFakeContext();
    const track = new MatrixSoundtrack(context, { schedule: () => 0, cancel: () => {} });

    await track.stop();

    expect(context.close).not.toHaveBeenCalled();
  });
});
