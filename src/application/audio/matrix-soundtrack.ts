/**
 * The Matrix-flavoured loop, synthesised rather than shipped.
 *
 * ## Why not an audio file
 *
 * The obvious choice is the film's score, and that is not available: it is Don
 * Davis's and licensing it for a personal site is not a thing that happens. A
 * royalty-free track would work, but it means a 1-3MB binary in the repository
 * that can never be diffed, reviewed or unit tested, and a page whose main
 * achievement is that almost nothing ships to the browser would be shipping a
 * megabyte to play ambience.
 *
 * The Web Audio API gets the same texture in a few hundred bytes of code: a
 * sub-bass pulse for the dread, filtered noise for the rain on the screen, and
 * sparse detuned bells for the machine thinking. It is original, weightless, and
 * every parameter is a number a test can assert on.
 *
 * ## Testability
 *
 * `AudioContext` is injected, never reached for. The unit tests pass a fake with
 * the same shape and assert on what was scheduled, which is the only part with
 * behaviour in it. Nothing here touches the DOM, so it also runs in Node.
 */

/**
 * `AudioContextState`, spelled out.
 *
 * The DOM lib's `AudioState` is not visible from this file, and importing a type
 * for one string union is not worth a global augmentation of the project's types.
 */
export type AudioContextState = "suspended" | "running" | "closed";

/** The slice of `AudioContext` this module needs. */
export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: AudioNode;
  state: AudioContextState;
  createOscillator(): OscillatorNodeLike;
  createGain(): GainNodeLike;
  createBiquadFilter(): BiquadFilterNodeLike;
  createBufferSource(): AudioBufferSourceNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface AudioNodeLike {
  connect(destination: unknown): unknown;
  disconnect(): void;
}

export interface GainNodeLike extends AudioNodeLike {
  gain: AudioParamLike;
}

export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
  cancelScheduledValues(time: number): unknown;
}

export interface OscillatorNodeLike extends AudioNodeLike {
  type: OscillatorType;
  frequency: AudioParamLike;
  detune: AudioParamLike;
  start(time?: number): void;
  stop(time?: number): void;
}

export interface BiquadFilterNodeLike extends AudioNodeLike {
  type: BiquadFilterType;
  frequency: AudioParamLike;
  Q: AudioParamLike;
}

export interface AudioBufferLike {
  readonly length: number;
  getChannelData(channel: number): Float32Array;
}

export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  start(time?: number): void;
  stop(time?: number): void;
}

export type MatrixSoundtrackOptions = {
  /** Peak gain. Kept low on purpose: this plays under a page being read. */
  volume?: number;
  /** Beat period in seconds for the sub-bass pulse. */
  pulseSeconds?: number;
  /** Master cutoff for the rain, in Hz. */
  rainHz?: number;
  /**
   * Timer factory, injected so the loop's repetition is assertable in a test
   * without a real clock. Defaults to `setTimeout`.
   */
  schedule?: (callback: () => void, delayMs: number) => unknown;
  /** Cancels a handle returned by `schedule`. */
  cancel?: (handle: unknown) => void;
};

const DEFAULTS = {
  volume: 0.16,
  pulseSeconds: 1.6,
  rainHz: 1400,
} as const;

/**
 * A running soundtrack.
 *
 * Deliberately one object owning its own graph, so stopping is a matter of
 * dropping the references and letting the context close — there is no scheduler
 * left behind to fire a note into a closed graph, which is the classic Web Audio
 * leak and the reason a naive loop is hard to unmount.
 */
export class MatrixSoundtrack {
  private readonly context: AudioContextLike;
  private readonly volume: number;
  private readonly pulseSeconds: number;
  private readonly rainHz: number;
  private readonly schedule: (callback: () => void, delayMs: number) => unknown;
  private readonly cancel: (handle: unknown) => void;

  private readonly started: AudioNodeLike[] = [];
  private master: GainNodeLike | null = null;
  private pending: unknown = null;
  private playing = false;

  constructor(context: AudioContextLike, options: MatrixSoundtrackOptions = {}) {
    this.context = context;
    this.volume = options.volume ?? DEFAULTS.volume;
    this.pulseSeconds = options.pulseSeconds ?? DEFAULTS.pulseSeconds;
    this.rainHz = options.rainHz ?? DEFAULTS.rainHz;
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Builds the graph and starts it.
   *
   * Must be called from a user gesture. Browsers suspend a context created
   * outside one, and the failure is silent — which is exactly the bug the explicit
   * click behind the footer button exists to prevent.
   */
  async start(): Promise<void> {
    if (this.playing) {
      return;
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    const now = this.context.currentTime;
    const master = this.context.createGain();
    master.gain.setValueAtTime(0, now);
    // Fade in rather than appearing at full volume, so turning it on is not a
    // bang.
    master.gain.linearRampToValueAtTime(this.volume, now + 0.6);
    master.connect(this.context.destination);
    this.master = master;

    this.schedulePulse(master, now);
    this.scheduleRain(master, now);
    this.scheduleBell(master, now);
    this.pump();

    this.playing = true;
  }

  /**
   * Keeps the pulse and the bell going.
   *
   * They are one-shot oscillators, so without this they fire once and the texture
   * dies after a second and a half, leaving nothing but rain. The rain loops on
   * its own because it is a buffer source with `loop = true`; an oscillator with
   * a shaped envelope cannot.
   *
   * The bell is sparse on purpose — it fires on roughly one beat in three, so the
   * pulse keeps a steady floor and the bell is the thing that occasionally
   * interrupts. A machine thinking is not a metronome, and a constant arpeggio
   * would fight the page for attention.
   */
  private pump(): void {
    this.pending = this.schedule(() => {
      if (!this.playing) {
        return;
      }

      /*
       * Re-read from the field rather than closing over a master passed in: this
       * fires after a delay, and `this.master` is set to null by `stop()`. A
       * captured reference would schedule oscillators into a graph that has
       * already been torn down.
       */
      const master = this.master;
      if (master === null) {
        return;
      }

      this.schedulePulse(master, this.context.currentTime);

      if (Math.random() < 0.34) {
        this.scheduleBell(master, this.context.currentTime);
      }

      this.pump();
    }, this.pulseSeconds * 1000);
  }

  /** Fades out and tears the graph down. Safe to call when not playing. */
  async stop(): Promise<void> {
    if (!this.playing) {
      return;
    }

    /*
     * Stop the pump first, before the fade. Cancelling after would let one more
     * tick schedule oscillators against a context that is about to close — the
     * leak this class exists to avoid.
     */
    this.playing = false;

    if (this.pending !== null) {
      this.cancel(this.pending);
      this.pending = null;
    }

    const now = this.context.currentTime;
    const master = this.master;

    if (master !== null) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.35);
    }

    // Let the fade actually be heard before the context goes away, otherwise
    // stopping is a click.
    await new Promise((resolve) => setTimeout(resolve, 400));

    for (const node of this.started) {
      try {
        node.disconnect();
      } catch {
        // A node already torn down by the context is not an error worth raising.
      }
    }
    this.started.length = 0;
    this.master = null;

    await this.context.close();
  }

  /**
   * The sub-bass pulse: the slow heartbeat under everything.
   *
   * A sine an octave and a half under middle C, amplitude-shaped with an
   * exponential decay so each beat is a swell rather than a click.
   */
  private schedulePulse(master: GainNodeLike, now: number): void {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(38, now);

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.9, now + 0.08);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + this.pulseSeconds * 0.9);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(now);
    oscillator.stop(now + this.pulseSeconds * 0.9);

    this.started.push(oscillator, envelope);
  }

  /**
   * The rain: filtered white noise, looping.
   *
   * Built into a buffer rather than an oscillator because "noise" is not a wave
   * the API has, and the lowpass is what turns hiss into weather.
   */
  private scheduleRain(master: GainNodeLike, now: number): void {
    const seconds = 2;
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * seconds), this.context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const level = this.context.createGain();

    source.buffer = buffer;
    source.loop = true;

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(this.rainHz, now);
    // A little resonance keeps it from sounding like a plain blur.
    filter.Q.setValueAtTime(0.7, now);

    level.gain.setValueAtTime(0.14, now);

    source.connect(filter);
    filter.connect(level);
    level.connect(master);
    source.start(now);

    this.started.push(source, filter, level);
  }

  /**
   * The bell: two detuned squares a fifth apart, ringing and stopping.
   *
   * Sparse on purpose. A machine thinking is not a metronome, and a constant arp
   * would fight the page for attention.
   */
  private scheduleBell(master: GainNodeLike, now: number): void {
    const first = this.context.createOscillator();
    const second = this.context.createOscillator();
    const envelope = this.context.createGain();

    first.type = "square";
    second.type = "square";

    first.frequency.setValueAtTime(220, now);
    second.frequency.setValueAtTime(330, now);
    // Detuning is what turns two identical oscillators into a chord.
    first.detune.setValueAtTime(-6, now);
    second.detune.setValueAtTime(7, now);

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.12, now + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    first.connect(envelope);
    second.connect(envelope);
    envelope.connect(master);

    first.start(now);
    second.start(now);
    first.stop(now + 1.4);
    second.stop(now + 1.4);

    this.started.push(first, second, envelope);
  }
}
