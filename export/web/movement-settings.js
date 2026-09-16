// Krunker-inspired arena movement: fast acceleration, strong air control, and slide-hop momentum.
export const MOVEMENT_SETTINGS = Object.freeze({
  walkSpeed: 190, sprintSpeed: 315, tacticalSprintSpeed: 315, crouchSpeed: 130,
  groundAcceleration: 4200, groundDeceleration: 3300, airAcceleration: 1850, friction: 6,
  slideSpeed: 370, slideDuration: 0.58, slideCooldown: 0.06, slideFriction: 0.72, slideSteer: 0.58,
  gravity: 1000, jumpVelocity: 365, coyoteTime: 0.09, jumpBufferTime: 0.11, airControl: 0.95, maxAirSpeed: 430, slideHopBoost: 1.045,
  sprintFovBoost: 3, slideFovBoost: 5, cameraSmoothing: 18, slideCameraDrop: 7, landingDip: 1.2,
});
