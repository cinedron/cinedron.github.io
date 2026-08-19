export const CRITERIA = Object.freeze({
  heightRatioCap: 0.75,
  minimumCableAngleDeg: 30,
  cablePlanningReserveRate: 0.10,
  cableRoundingIncrement: 0.5,
  gravity: 9.80665
});

function assertPositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} 값은 0보다 큰 숫자여야 합니다.`);
  }
}

function roundUp(value, increment) {
  return Math.ceil(value / increment) * increment;
}

export function calculateInstallation({ width, length, pulleyHeight, payloadMass }) {
  assertPositiveFinite(width, "가로");
  assertPositiveFinite(length, "세로");
  assertPositiveFinite(pulleyHeight, "도르래 높이");
  assertPositiveFinite(payloadMass, "페이로드 무게");

  const floorDiagonal = Math.hypot(width, length);
  const centerRadius = floorDiagonal / 2;

  // One winch is assumed to sit directly below its pulley. The longest free span
  // reaches from that pulley to the opposite floor corner.
  const maxFreeSpan = Math.hypot(width, length, pulleyHeight);
  const minimumCableLength = pulleyHeight + maxFreeSpan;
  const planningCableLength = roundUp(
    minimumCableLength * (1 + CRITERIA.cablePlanningReserveRate),
    CRITERIA.cableRoundingIncrement
  );

  const minimumAngleRad = CRITERIA.minimumCableAngleDeg * Math.PI / 180;
  const heightByRatio = pulleyHeight * CRITERIA.heightRatioCap;
  const requiredDropForAngle = centerRadius * Math.tan(minimumAngleRad);
  const heightByAngleRaw = pulleyHeight - requiredDropForAngle;
  const heightByAngle = Math.max(0, heightByAngleRaw);
  const recommendedMaxHeight = Math.min(heightByRatio, heightByAngle);

  const selectedVerticalDrop = pulleyHeight - recommendedMaxHeight;
  const selectedAngleRad = Math.atan2(selectedVerticalDrop, centerRadius);
  const selectedAngleDeg = selectedAngleRad * 180 / Math.PI;
  const ratio75AngleDeg = Math.atan2(
    pulleyHeight - heightByRatio,
    centerRadius
  ) * 180 / Math.PI;

  // Symmetric, static center position: four equal cable tensions share gravity.
  // This excludes pre-tension, cable weight, friction and all dynamic loads.
  const staticTensionKgF = payloadMass / (4 * Math.sin(selectedAngleRad));
  const staticTensionN = staticTensionKgF * CRITERIA.gravity;

  let heightLimiter = "75% 상한";
  if (heightByAngleRaw <= 0) {
    heightLimiter = "30° 기준 충족 불가";
  } else if (heightByAngle < heightByRatio) {
    heightLimiter = "30° 각도 제한";
  }

  return Object.freeze({
    floorDiagonal,
    centerRadius,
    maxFreeSpan,
    minimumCableLength,
    planningCableLength,
    heightByRatio,
    heightByAngle,
    heightByAngleRaw,
    recommendedMaxHeight,
    heightPercentage: recommendedMaxHeight / pulleyHeight * 100,
    selectedAngleDeg,
    ratio75AngleDeg,
    ratio75PassesAngleCriterion: ratio75AngleDeg >= CRITERIA.minimumCableAngleDeg,
    conservativeHeightAvailable: heightByAngleRaw > 0,
    heightLimiter,
    staticTensionKgF,
    staticTensionN
  });
}
