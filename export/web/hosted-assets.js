export const HOSTED_ASSETS = Object.freeze({
  ballista_r2: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663932879981/VYyIzKBGpUbeLrLI.glb',
  dsr50_r2: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663932879981/EeUISuHYtmuBwKhu.glb',
  fal_osw_r2: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663932879981/XrSMVRlthiPFJObB.glb',
  hamr: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663932879981/fCyscqutHzpKvZWn.glb',
  dlq33: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663932879981/wwWGupVcJoddkJcI.glb',
  alcatraz: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663932879981/uhitCgMeKrKZjyRl.glb',
});

export function hostedAssetUrl(id) {
  return HOSTED_ASSETS[id] ?? null;
}
