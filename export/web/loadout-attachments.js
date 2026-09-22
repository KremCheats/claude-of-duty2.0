export const LOADOUT_ATTACHMENTS = Object.freeze({
  standard: Object.freeze({
    id: 'standard',
    name: 'STANDARD',
    detail: 'Factory configuration',
    magazineScale: 1,
    reloadScale: 1,
    adsTimeScale: 1,
    recoilScale: 1,
  }),
  extended_mag: Object.freeze({
    id: 'extended_mag',
    name: 'EXTENDED MAG',
    detail: '+50% magazine capacity',
    magazineScale: 1.5,
    reloadScale: 1,
    adsTimeScale: 1,
    recoilScale: 1,
  }),
  fast_mag: Object.freeze({
    id: 'fast_mag',
    name: 'FAST MAG',
    detail: '20% faster reload',
    magazineScale: 1,
    reloadScale: 1.25,
    adsTimeScale: 1,
    recoilScale: 1,
  }),
  quickdraw: Object.freeze({
    id: 'quickdraw',
    name: 'QUICKDRAW',
    detail: '28% faster aim-down-sight raise',
    magazineScale: 1,
    reloadScale: 1,
    adsTimeScale: 0.72,
    recoilScale: 1,
  }),
  foregrip: Object.freeze({
    id: 'foregrip',
    name: 'FOREGRIP',
    detail: '22% lower view recoil',
    magazineScale: 1,
    reloadScale: 1,
    adsTimeScale: 1,
    recoilScale: 0.78,
  }),
});

export const LOADOUT_ATTACHMENT_IDS = Object.freeze(Object.keys(LOADOUT_ATTACHMENTS));

export function normalizeLoadoutAttachment(value) {
  return LOADOUT_ATTACHMENTS[value] ? value : 'standard';
}

export function attachmentProfile(value) {
  return LOADOUT_ATTACHMENTS[normalizeLoadoutAttachment(value)];
}
