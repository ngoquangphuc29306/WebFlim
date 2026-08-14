declare module 'plyr' {
  interface PlyrSpeedOptions {
    selected: number;
    options: number[];
  }

  interface PlyrOptions {
    controls?: string[];
    settings?: string[];
    speed?: PlyrSpeedOptions;
    captions?: { active?: boolean; update?: boolean };
  }

  class Plyr {
    constructor(target: HTMLVideoElement, options?: PlyrOptions);
    destroy(): void;
  }

  export default Plyr;
}
