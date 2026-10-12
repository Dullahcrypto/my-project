// Screen layouts for the two formats. Everything is in pixels of the composition.
// Vertical keeps clear of the top 250px and bottom ~380px where Reels/Status UI sits.

export type Band = { x0: number; x1: number; cy: number; h: number };

export type Layout = {
  W: number;
  H: number;
  vertical: boolean;
  margin: number;
  contentW: number;
  hook: { top: number; size: number; waveY: number; amp: number };
  promise: { logoY: number; logoSize: number; headTop: number; headSize: number; nameTop: number; waveY: number; amp: number };
  services: {
    eyebrowTop: number;
    textLeft: number;
    textWidth: number;
    textAlign: 'left' | 'center';
    titleTop: number;
    titleSize: number;
    descSize: number;
    band: Band;
  };
  steps: { eyebrowTop: number; headTop: number; headSize: number; y: number; x0: number; x1: number; labelSize: number; labelWidth: number };
  cta: {
    logoY: number;
    logoSize: number;
    nameTop: number;
    labelTop: number;
    labelSize: number;
    numberTop: number;
    numberSize: number;
    underY: number;
    underHalf: number;
    addressTop: number;
    addressSize: number;
    hoursTop: number;
    hoursSize: number;
  };
  brand: { top: number; left: number; align: 'left' | 'center' };
};

export function getLayout(W: number, H: number): Layout {
  const vertical = H > W;
  if (vertical) {
    const margin = 96;
    return {
      W, H, vertical, margin, contentW: W - margin * 2,
      hook: { top: 560, size: 132, waveY: 1250, amp: 120 },
      promise: { logoY: 560, logoSize: 220, headTop: 790, headSize: 96, nameTop: 1150, waveY: 1330, amp: 55 },
      services: {
        eyebrowTop: 360,
        textLeft: margin,
        textWidth: W - margin * 2,
        textAlign: 'left',
        titleTop: 1200,
        titleSize: 86,
        descSize: 42,
        band: { x0: margin, x1: W - margin, cy: 820, h: 500 },
      },
      steps: { eyebrowTop: 360, headTop: 440, headSize: 84, y: 1020, x0: 170, x1: W - 170, labelSize: 36, labelWidth: 230 },
      cta: {
        logoY: 400, logoSize: 150, nameTop: 500,
        labelTop: 720, labelSize: 52,
        numberTop: 800, numberSize: 112,
        underY: 1000, underHalf: 400,
        addressTop: 1085, addressSize: 40,
        hoursTop: 1240, hoursSize: 36,
      },
      brand: { top: 150, left: margin, align: 'center' },
    };
  }
  const margin = 140;
  return {
    W, H, vertical, margin, contentW: W - margin * 2,
    hook: { top: 230, size: 124, waveY: 760, amp: 95 },
    promise: { logoY: 225, logoSize: 170, headTop: 370, headSize: 100, nameTop: 640, waveY: 830, amp: 45 },
    services: {
      eyebrowTop: 330,
      textLeft: margin,
      textWidth: 760,
      textAlign: 'left',
      titleTop: 400,
      titleSize: 90,
      descSize: 40,
      band: { x0: 980, x1: W - margin, cy: 560, h: 420 },
    },
    steps: { eyebrowTop: 200, headTop: 270, headSize: 84, y: 620, x0: 330, x1: W - 330, labelSize: 38, labelWidth: 300 },
    cta: {
      logoY: 175, logoSize: 120, nameTop: 255,
      labelTop: 385, labelSize: 50,
      numberTop: 455, numberSize: 120,
      underY: 652, underHalf: 440,
      addressTop: 715, addressSize: 38,
      hoursTop: 785, hoursSize: 34,
    },
    brand: { top: 70, left: margin, align: 'left' },
  };
}
