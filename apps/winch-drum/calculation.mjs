const EPSILON = 1e-9;

function assertPositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} 값은 0보다 큰 숫자여야 합니다.`);
  }
}

function assertNonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} 값은 0 이상의 숫자여야 합니다.`);
  }
}

function helixLengthPerWrap(centerlineDiameter, pitch) {
  return Math.hypot(Math.PI * centerlineDiameter, pitch);
}

export function calculateDrumCapacity(input) {
  const {
    ropeDiameter,
    coreDiameter,
    flangeDiameter,
    drumWidth,
    freeboard,
    deadWraps,
    planningEfficiency,
    requiredLength,
    leadDistance,
    drumType,
    firstLayerLinePull
  } = input;

  assertPositiveFinite(ropeDiameter, "와이어 직경");
  assertPositiveFinite(coreDiameter, "드럼 코어 직경");
  assertPositiveFinite(flangeDiameter, "플랜지 직경");
  assertPositiveFinite(drumWidth, "드럼 유효 폭");
  assertNonnegativeFinite(freeboard, "프리보드");
  assertNonnegativeFinite(deadWraps, "잔여 권수");
  assertPositiveFinite(planningEfficiency, "계획 사용률");
  assertNonnegativeFinite(requiredLength, "필요 와이어 길이");
  assertPositiveFinite(leadDistance, "첫 고정 도르래 거리");
  assertNonnegativeFinite(firstLayerLinePull, "1층 정격 라인풀");

  if (planningEfficiency > 1) {
    throw new RangeError("계획 사용률은 100% 이하여야 합니다.");
  }
  if (!Number.isInteger(deadWraps)) {
    throw new RangeError("잔여 권수는 정수로 입력하세요.");
  }
  if (drumType !== "smooth" && drumType !== "grooved") {
    throw new RangeError("드럼 종류를 확인해 주세요.");
  }

  const effectiveFlangeDiameter = flangeDiameter - freeboard * 2;
  const maximumLayers = Math.floor(
    (effectiveFlangeDiameter - coreDiameter) / (ropeDiameter * 2) + EPSILON
  );
  const wrapsPerLayer = Math.floor(drumWidth / ropeDiameter + EPSILON);
  if (maximumLayers < 1) {
    throw new RangeError("프리보드를 제외한 플랜지 높이에 와이어 한 층도 들어가지 않습니다.");
  }
  if (wrapsPerLayer < 1) {
    throw new RangeError("드럼 유효 폭이 와이어 직경보다 작습니다.");
  }
  if (deadWraps >= wrapsPerLayer) {
    throw new RangeError("잔여 권수는 첫 층 전체 권수보다 작아야 합니다.");
  }

  let cumulativeLengthMm = 0;
  const layers = [];
  for (let layer = 1; layer <= maximumLayers; layer += 1) {
    const centerlineDiameter = coreDiameter + ropeDiameter * (2 * layer - 1);
    const lengthPerWrap = helixLengthPerWrap(centerlineDiameter, ropeDiameter);
    const layerLengthMm = wrapsPerLayer * lengthPerWrap;
    cumulativeLengthMm += layerLengthMm;
    const linePullRatio = (coreDiameter + ropeDiameter) / centerlineDiameter;
    layers.push(Object.freeze({
      layer,
      centerlineDiameter,
      wraps: wrapsPerLayer,
      layerLength: layerLengthMm / 1000,
      cumulativeLength: cumulativeLengthMm / 1000,
      linePullRatio,
      estimatedLinePull: firstLayerLinePull > 0 ? firstLayerLinePull * linePullRatio : null
    }));
  }

  const firstLayerWrapLengthMm = helixLengthPerWrap(
    coreDiameter + ropeDiameter,
    ropeDiameter
  );
  const deadWrapLength = deadWraps * firstLayerWrapLengthMm / 1000;
  const totalStorageCapacity = cumulativeLengthMm / 1000;
  const totalWorkingCapacity = Math.max(0, totalStorageCapacity - deadWrapLength);
  const planningCapacity = totalWorkingCapacity * planningEfficiency;
  const targetFits = requiredLength <= planningCapacity + EPSILON;
  const targetDifference = planningCapacity - requiredLength;
  const requiredStorageLength = requiredLength / planningEfficiency + deadWrapLength;
  let requiredLayers = 0;
  if (requiredLength > EPSILON) {
    requiredLayers = layers.find((layer) => layer.cumulativeLength + EPSILON >= requiredStorageLength)?.layer
      ?? maximumLayers + 1;
  }

  const fleetAngleDeg = Math.atan((drumWidth / 2) / leadDistance) * 180 / Math.PI;
  const fleetAngleMinimumDeg = 0.5;
  const fleetAngleMaximumDeg = drumType === "smooth" ? 1.5 : 2;
  const recommendedMinimumLeadDistance =
    (drumWidth / 2) / Math.tan(fleetAngleMaximumDeg * Math.PI / 180);
  const recommendedMaximumLeadDistance =
    (drumWidth / 2) / Math.tan(fleetAngleMinimumDeg * Math.PI / 180);
  const fleetAngleWithinMaximum = fleetAngleDeg <= fleetAngleMaximumDeg + EPSILON;
  const fleetAngleWithinRecommendedRange =
    fleetAngleDeg >= fleetAngleMinimumDeg - EPSILON && fleetAngleWithinMaximum;
  const ddRatio = coreDiameter / ropeDiameter;

  return Object.freeze({
    effectiveFlangeDiameter,
    maximumLayers,
    wrapsPerLayer,
    totalStorageCapacity,
    deadWrapLength,
    totalWorkingCapacity,
    planningCapacity,
    targetFits,
    targetDifference,
    requiredLayers,
    fleetAngleDeg,
    fleetAngleMinimumDeg,
    fleetAngleMaximumDeg,
    fleetAngleWithinMaximum,
    fleetAngleWithinRecommendedRange,
    recommendedMinimumLeadDistance,
    recommendedMaximumLeadDistance,
    ddRatio,
    layers: Object.freeze(layers)
  });
}
