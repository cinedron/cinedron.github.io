export const CRITERIA = Object.freeze({
  heightRatioReference: 0.75,
  cablePlanningReserveRate: 0.10,
  cableRoundingIncrement: 0.5,
  gravity: 9.80665
});

const EPSILON = 1e-9;

function assertPositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} 값은 0보다 큰 숫자여야 합니다.`);
  }
}

function assertFinite(value, label) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} 값은 숫자여야 합니다.`);
  }
}

function roundUp(value, increment) {
  return Math.ceil(value / increment) * increment;
}

function determinant3(matrix) {
  return (
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
  );
}

function solve3x3(matrix, vector) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < 3; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][column]) < EPSILON) {
      return null;
    }

    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
    const pivot = augmented[column][column];
    for (let item = column; item < 4; item += 1) {
      augmented[column][item] /= pivot;
    }

    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let item = column; item < 4; item += 1) {
        augmented[row][item] -= factor * augmented[column][item];
      }
    }
  }

  return augmented.map((row) => row[3]);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function minimumNormNonnegativeTensions(unitVectors, loadVector) {
  const gram = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) =>
      unitVectors.reduce((sum, vector) => sum + vector[row] * vector[column], 0)
    )
  );
  const dual = solve3x3(gram, loadVector);
  if (!dual) return null;

  const base = unitVectors.map((vector) => dot(vector, dual));
  const nullVector = Array.from({ length: 4 }, (_, omittedColumn) => {
    const remainingVectors = unitVectors.filter((_, column) => column !== omittedColumn);
    const submatrix = Array.from({ length: 3 }, (_, row) =>
      remainingVectors.map((vector) => vector[row])
    );
    return (omittedColumn % 2 === 0 ? 1 : -1) * determinant3(submatrix);
  });

  const nullNorm = Math.hypot(...nullVector);
  if (nullNorm < EPSILON) return null;
  const normalizedNull = nullVector.map((value) => value / nullNorm);

  let lower = Number.NEGATIVE_INFINITY;
  let upper = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 4; index += 1) {
    const direction = normalizedNull[index];
    if (direction > EPSILON) {
      lower = Math.max(lower, -base[index] / direction);
    } else if (direction < -EPSILON) {
      upper = Math.min(upper, -base[index] / direction);
    } else if (base[index] < -EPSILON) {
      return null;
    }
  }

  if (lower > upper + EPSILON) return null;
  const lambda = Math.min(Math.max(0, lower), upper);
  const tensions = base.map((value, index) =>
    Math.max(0, value + lambda * normalizedNull[index])
  );

  const residual = [0, 1, 2].map((row) =>
    unitVectors.reduce(
      (sum, vector, column) => sum + vector[row] * tensions[column],
      0
    ) - loadVector[row]
  );

  if (Math.hypot(...residual) > 1e-5) return null;
  return tensions;
}

export function calculateInstallation({ width, length, pulleyHeight, payloadMass }) {
  assertPositiveFinite(width, "가로");
  assertPositiveFinite(length, "세로");
  assertPositiveFinite(pulleyHeight, "도르래 높이");
  assertPositiveFinite(payloadMass, "페이로드 무게");

  const floorDiagonal = Math.hypot(width, length);
  const centerRadius = floorDiagonal / 2;

  // A winch is assumed to sit directly below its pulley. The longest free span
  // reaches from that pulley to the opposite floor corner.
  const maxFreeSpan = Math.hypot(width, length, pulleyHeight);
  const minimumCableLength = pulleyHeight + maxFreeSpan;
  const planningCableLength = roundUp(
    minimumCableLength * (1 + CRITERIA.cablePlanningReserveRate),
    CRITERIA.cableRoundingIncrement
  );

  const referenceHeight75 = pulleyHeight * CRITERIA.heightRatioReference;
  const referenceDrop75 = pulleyHeight - referenceHeight75;
  const referenceAngle75Rad = Math.atan2(referenceDrop75, centerRadius);
  const referenceAngle75Deg = referenceAngle75Rad * 180 / Math.PI;
  const staticTensionAt75KgF = payloadMass / (4 * Math.sin(referenceAngle75Rad));

  return Object.freeze({
    width,
    length,
    pulleyHeight,
    payloadMass,
    floorDiagonal,
    centerRadius,
    maxFreeSpan,
    minimumCableLength,
    planningCableLength,
    referenceHeight75,
    referenceDrop75,
    referenceAngle75Deg,
    referenceVerticalComplementDeg: 90 - referenceAngle75Deg,
    staticTensionAt75KgF,
    staticTensionAt75N: staticTensionAt75KgF * CRITERIA.gravity
  });
}

export function calculatePointAnalysis(installation, point) {
  const { width, length, pulleyHeight, payloadMass, planningCableLength } = installation;
  const { x, y, z } = point;
  assertFinite(x, "X");
  assertFinite(y, "Y");
  assertFinite(z, "Z");

  if (Math.abs(x) > width / 2 + EPSILON) {
    throw new RangeError(`X는 ${-width / 2}m부터 ${width / 2}m 사이여야 합니다.`);
  }
  if (Math.abs(y) > length / 2 + EPSILON) {
    throw new RangeError(`Y는 ${-length / 2}m부터 ${length / 2}m 사이여야 합니다.`);
  }
  if (z < 0 || z >= pulleyHeight - 0.01) {
    throw new RangeError("Z는 0m 이상, 도르래 높이보다 최소 0.01m 낮아야 합니다.");
  }

  const anchors = [
    { id: 1, label: "좌측 전면", x: -width / 2, y: -length / 2, z: pulleyHeight },
    { id: 2, label: "우측 전면", x: width / 2, y: -length / 2, z: pulleyHeight },
    { id: 3, label: "우측 후면", x: width / 2, y: length / 2, z: pulleyHeight },
    { id: 4, label: "좌측 후면", x: -width / 2, y: length / 2, z: pulleyHeight }
  ];

  const geometry = anchors.map((anchor) => {
    const vector = [anchor.x - x, anchor.y - y, anchor.z - z];
    const freeSpan = Math.hypot(...vector);
    return {
      ...anchor,
      vector,
      unitVector: vector.map((value) => value / freeSpan),
      freeSpan,
      totalUsedLength: pulleyHeight + freeSpan,
      remainingPlanningLength: planningCableLength - pulleyHeight - freeSpan,
      cableAngleDeg: Math.asin((pulleyHeight - z) / freeSpan) * 180 / Math.PI
    };
  });

  const loadN = payloadMass * CRITERIA.gravity;
  const tensionsN = minimumNormNonnegativeTensions(
    geometry.map((cable) => cable.unitVector),
    [0, 0, loadN]
  );

  const cables = geometry.map((cable, index) => ({
    ...cable,
    tensionN: tensionsN ? tensionsN[index] : null,
    tensionKgF: tensionsN ? tensionsN[index] / CRITERIA.gravity : null
  }));

  const finiteTensions = cables
    .map((cable) => cable.tensionN)
    .filter((value) => value !== null);
  const maximumTensionN = finiteTensions.length ? Math.max(...finiteTensions) : null;
  const minimumTensionN = finiteTensions.length ? Math.min(...finiteTensions) : null;
  const tensionSpreadRatio =
    maximumTensionN !== null && minimumTensionN !== null && minimumTensionN > EPSILON
      ? maximumTensionN / minimumTensionN
      : Number.POSITIVE_INFINITY;

  return Object.freeze({
    point: Object.freeze({ x, y, z }),
    cables: Object.freeze(cables.map((cable) => Object.freeze(cable))),
    tensionSolutionAvailable: Boolean(tensionsN),
    minimumCableAngleDeg: Math.min(...cables.map((cable) => cable.cableAngleDeg)),
    maximumCableAngleDeg: Math.max(...cables.map((cable) => cable.cableAngleDeg)),
    maximumTensionN,
    minimumTensionN,
    tensionSpreadRatio,
    nearSlackInMinimumNormSolution:
      maximumTensionN !== null && minimumTensionN !== null &&
      minimumTensionN < maximumTensionN * 0.05,
    positionHeightPercent: z / pulleyHeight * 100,
    isCenterPosition: Math.abs(x) < EPSILON && Math.abs(y) < EPSILON
  });
}
