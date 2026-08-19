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

export function calculateDrumCapacity(input) {
  const {
    ropeDiameter,
    coreDiameter,
    drumWidth,
    windingPitch,
    freeboard,
    deadWraps,
    planningEfficiency,
    requiredLength,
    leadDistance,
    drumType
  } = input;

  assertPositiveFinite(ropeDiameter, "와이어 직경");
  assertPositiveFinite(coreDiameter, "드럼 코어 직경");
  assertPositiveFinite(drumWidth, "드럼 유효 폭");
  assertPositiveFinite(windingPitch, "권취 피치");
  assertNonnegativeFinite(freeboard, "프리보드");
  assertNonnegativeFinite(deadWraps, "잔여 권수");
  assertPositiveFinite(planningEfficiency, "계획 사용률");
  assertNonnegativeFinite(requiredLength, "필요 와이어 길이");
  assertPositiveFinite(leadDistance, "첫 고정 도르래 거리");

  if (windingPitch + EPSILON < ropeDiameter) {
    throw new RangeError("권취 피치는 와이어 직경보다 작을 수 없습니다.");
  }
  if (planningEfficiency > 1) {
    throw new RangeError("계획 사용률은 100% 이하여야 합니다.");
  }
  if (!Number.isInteger(deadWraps)) {
    throw new RangeError("잔여 권수는 정수로 입력하세요.");
  }
  if (drumType !== "smooth" && drumType !== "grooved") {
    throw new RangeError("드럼 종류를 확인해 주세요.");
  }

  const totalWraps = Math.floor(drumWidth / windingPitch + EPSILON);
  if (totalWraps < 1) {
    throw new RangeError("드럼 유효 폭에 와이어 한 바퀴도 배치할 수 없습니다.");
  }
  if (deadWraps >= totalWraps) {
    throw new RangeError("잔여 권수는 단층 전체 권수보다 작아야 합니다.");
  }

  const centerlineDiameter = coreDiameter + ropeDiameter;
  const lengthPerWrap = Math.hypot(Math.PI * centerlineDiameter, windingPitch) / 1000;
  const usableWraps = totalWraps - deadWraps;
  const totalStorageCapacity = totalWraps * lengthPerWrap;
  const deadWrapLength = deadWraps * lengthPerWrap;
  const totalWorkingCapacity = usableWraps * lengthPerWrap;
  const planningCapacity = totalWorkingCapacity * planningEfficiency;
  const targetFits = requiredLength <= planningCapacity + EPSILON;
  const targetDifference = planningCapacity - requiredLength;
  const requiredUsableWraps = requiredLength > EPSILON
    ? Math.ceil(requiredLength / (lengthPerWrap * planningEfficiency) - EPSILON)
    : 0;
  const requiredTotalWraps = requiredUsableWraps + deadWraps;
  const requiredDrumWidth = requiredTotalWraps * windingPitch;
  const widthDifference = drumWidth - requiredDrumWidth;
  const minimumFlangeDiameter = coreDiameter + ropeDiameter * 2 + freeboard * 2;

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

  return Object.freeze({
    centerlineDiameter,
    lengthPerWrap,
    totalWraps,
    usableWraps,
    totalStorageCapacity,
    deadWrapLength,
    totalWorkingCapacity,
    planningCapacity,
    targetFits,
    targetDifference,
    requiredUsableWraps,
    requiredTotalWraps,
    requiredDrumWidth,
    widthDifference,
    minimumFlangeDiameter,
    fleetAngleDeg,
    fleetAngleMinimumDeg,
    fleetAngleMaximumDeg,
    fleetAngleWithinMaximum,
    fleetAngleWithinRecommendedRange,
    recommendedMinimumLeadDistance,
    recommendedMaximumLeadDistance,
    ddRatio: coreDiameter / ropeDiameter
  });
}
