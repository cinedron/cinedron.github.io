import {
  calculateInstallation,
  calculatePointAnalysis,
  calculateWorkspaceMap,
  CRITERIA
} from "./calculation.mjs?v=20260819-workspace1";

const installationForm = document.querySelector("#installation-form");
const installationError = document.querySelector("#form-error");
const emptyState = document.querySelector("#result-empty");
const resultContent = document.querySelector("#result-content");
const heightAssessment = document.querySelector("#height-assessment");
const assessmentTitle = document.querySelector("#assessment-title");
const assessmentCopy = document.querySelector("#assessment-copy");
const pointForm = document.querySelector("#point-form");
const pointFieldset = document.querySelector("#point-fieldset");
const pointError = document.querySelector("#point-error");
const centerPositionButton = document.querySelector("#center-position-button");
const pointX = document.querySelector("#point-x");
const pointY = document.querySelector("#point-y");
const pointZ = document.querySelector("#point-z");
const xRange = document.querySelector("#x-range");
const yRange = document.querySelector("#y-range");
const zRange = document.querySelector("#z-range");
const simulationEmpty = document.querySelector("#simulation-empty");
const simulationContent = document.querySelector("#simulation-content");
const simulationCanvas = document.querySelector("#simulation-canvas");
const cableTableBody = document.querySelector("#cable-table-body");
const pointAssessment = document.querySelector("#point-assessment");
const pointAssessmentTitle = document.querySelector("#point-assessment-title");
const pointAssessmentCopy = document.querySelector("#point-assessment-copy");
const workspaceForm = document.querySelector("#workspace-form");
const workspaceFieldset = document.querySelector("#workspace-fieldset");
const workspaceError = document.querySelector("#workspace-error");
const workspaceZ = document.querySelector("#workspace-z");
const usePointHeightButton = document.querySelector("#use-point-height-button");
const workspaceEmpty = document.querySelector("#workspace-empty");
const workspaceContent = document.querySelector("#workspace-content");
const workspaceCanvas = document.querySelector("#workspace-canvas");

const outputs = new Map(
  Array.from(document.querySelectorAll("[data-output]"), (element) => [
    element.dataset.output,
    element
  ])
);
const pointOutputs = new Map(
  Array.from(document.querySelectorAll("[data-point-output]"), (element) => [
    element.dataset.pointOutput,
    element
  ])
);
const workspaceOutputs = new Map(
  Array.from(document.querySelectorAll("[data-workspace-output]"), (element) => [
    element.dataset.workspaceOutput,
    element
  ])
);

const oneDecimal = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const twoDecimals = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const wholeNumber = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0
});

let currentInstallation = null;
let currentPointAnalysis = null;
let currentWorkspaceMap = null;
let hasCalculatedInstallation = false;
let hasCalculatedPoint = false;

function readInstallationValues() {
  const data = new FormData(installationForm);
  return {
    width: Number(data.get("width")),
    length: Number(data.get("length")),
    pulleyHeight: Number(data.get("pulleyHeight")),
    payloadMass: Number(data.get("payloadMass"))
  };
}

function readPointValues() {
  const data = new FormData(pointForm);
  return {
    x: Number(data.get("x")),
    y: Number(data.get("y")),
    z: Number(data.get("z"))
  };
}

function readWorkspaceValues() {
  const data = new FormData(workspaceForm);
  return {
    z: Number(data.get("z")),
    minimumTensionKgF: Number(data.get("minimumTensionKgF")),
    maximumTensionKgF: Number(data.get("maximumTensionKgF")),
    horizontalAcceleration: Number(data.get("horizontalAcceleration")),
    verticalAcceleration: Number(data.get("verticalAcceleration"))
  };
}

function setOutput(map, name, value) {
  const element = map.get(name);
  if (element) element.textContent = value;
}

function updateHeightAssessment(result) {
  heightAssessment.className = "assessment";
  heightAssessment.classList.add("assessment--caution");
  assessmentTitle.textContent =
    `천장면과 와이어 사이의 각도는 ${oneDecimal.format(result.referenceAngle75Deg)}°입니다.`;
  assessmentCopy.textContent =
    `중앙에서 도르래까지 수평거리 ${oneDecimal.format(result.centerRadius)}m, 수직 낙차 ${oneDecimal.format(result.referenceDrop75)}m로 계산했습니다. ` +
    `수직선과의 각도는 ${oneDecimal.format(result.referenceVerticalComplementDeg)}°이며, 특정 각도를 통과·실패 기준으로 사용하지 않습니다.`;
}

function configurePointInputs(result) {
  if (!pointFieldset || !pointX || !pointY || !pointZ) return;
  const halfWidth = result.width / 2;
  const halfLength = result.length / 2;
  const maximumZ = Math.max(0, result.pulleyHeight - 0.01);

  pointX.min = String(-halfWidth);
  pointX.max = String(halfWidth);
  pointY.min = String(-halfLength);
  pointY.max = String(halfLength);
  pointZ.min = "0";
  pointZ.max = String(maximumZ);

  xRange.textContent = `${oneDecimal.format(-halfWidth)} ~ ${oneDecimal.format(halfWidth)}m`;
  yRange.textContent = `${oneDecimal.format(-halfLength)} ~ ${oneDecimal.format(halfLength)}m`;
  zRange.textContent = `0 ~ ${oneDecimal.format(maximumZ)}m · 바닥 기준`;
  pointFieldset.disabled = false;

  if (workspaceFieldset && workspaceZ) {
    workspaceZ.min = "0";
    workspaceZ.max = String(maximumZ);
    workspaceZ.value = result.referenceHeight75.toFixed(2);
    workspaceFieldset.disabled = false;
  }
}

function useCenterReferencePosition() {
  if (!currentInstallation || !pointX || !pointY || !pointZ) return;
  pointX.value = "0";
  pointY.value = "0";
  pointZ.value = currentInstallation.referenceHeight75.toFixed(2);
  renderPointAnalysis();
}

function renderInstallationResult() {
  const result = calculateInstallation(readInstallationValues());
  currentInstallation = result;

  setOutput(outputs, "planningCableLength", oneDecimal.format(result.planningCableLength));
  setOutput(outputs, "minimumCableLength", oneDecimal.format(result.minimumCableLength));
  setOutput(outputs, "referenceHeight75", oneDecimal.format(result.referenceHeight75));
  setOutput(outputs, "referenceAngle75Deg", oneDecimal.format(result.referenceAngle75Deg));
  setOutput(
    outputs,
    "referenceVerticalComplementDeg",
    oneDecimal.format(result.referenceVerticalComplementDeg)
  );
  setOutput(outputs, "referenceDrop75", oneDecimal.format(result.referenceDrop75));
  setOutput(outputs, "maxFreeSpan", oneDecimal.format(result.maxFreeSpan));
  setOutput(outputs, "floorDiagonal", oneDecimal.format(result.floorDiagonal));
  setOutput(
    outputs,
    "staticTensionAt75KgF",
    oneDecimal.format(result.staticTensionAt75KgF)
  );
  setOutput(outputs, "staticTensionAt75N", wholeNumber.format(result.staticTensionAt75N));
  // Temporary compatibility for a cached first-version HTML document.
  setOutput(outputs, "recommendedMaxHeight", oneDecimal.format(result.referenceHeight75));
  setOutput(outputs, "heightPercentage", "75.0");
  setOutput(outputs, "heightLimiter", "75% 참고값");
  setOutput(outputs, "selectedAngleDeg", oneDecimal.format(result.referenceAngle75Deg));
  setOutput(outputs, "staticTensionKgF", oneDecimal.format(result.staticTensionAt75KgF));
  setOutput(outputs, "staticTensionN", wholeNumber.format(result.staticTensionAt75N));

  updateHeightAssessment(result);
  configurePointInputs(result);
  installationError.hidden = true;
  emptyState.hidden = true;
  resultContent.hidden = false;
  hasCalculatedInstallation = true;
  if (pointForm) useCenterReferencePosition();
  if (currentWorkspaceMap && workspaceForm?.checkValidity()) renderWorkspaceMap();
}

function updatePointAssessment(analysis) {
  pointAssessment.className = "assessment";

  if (!analysis.tensionSolutionAvailable) {
    pointAssessment.classList.add("assessment--danger");
    pointAssessmentTitle.textContent = "이 단순 모델에서 비음수 정적 평형해를 찾지 못했습니다.";
    pointAssessmentCopy.textContent =
      "페이로드 자세, 연결점 간격과 프리텐션을 포함한 별도 해석이 필요합니다.";
    return;
  }

  if (analysis.nearSlackInMinimumNormSolution) {
    pointAssessment.classList.add("assessment--caution");
    pointAssessmentTitle.textContent = "최소노름 해에서 한 케이블이 거의 느슨해지는 위치입니다.";
    pointAssessmentCopy.textContent =
      "실제 시스템은 모든 케이블의 최소 프리텐션과 제어기 장력 배분을 적용해 다시 검토해야 합니다.";
    return;
  }

  pointAssessment.classList.add("assessment--ok");
  pointAssessmentTitle.textContent = "중력에 대한 비음수 정적 평형 참고해가 존재합니다.";
  pointAssessmentCopy.textContent =
    "표시 장력은 가능한 여러 해 중 제곱합이 가장 작은 값이며 실제 운용 장력을 의미하지 않습니다.";
}

function tensionClass(tensionN, minimumTensionN, maximumTensionN) {
  if (tensionN === null || maximumTensionN === null || minimumTensionN === null) {
    return "cable-dot--unknown";
  }
  const span = maximumTensionN - minimumTensionN;
  if (span < 1e-6) return "cable-dot--low";
  const ratio = (tensionN - minimumTensionN) / span;
  if (ratio > 0.75) return "cable-dot--peak";
  if (ratio > 0.4) return "cable-dot--high";
  return "cable-dot--low";
}

function appendCell(row, text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  row.append(cell);
}

function renderCableTable(analysis) {
  cableTableBody.replaceChildren();

  for (const cable of analysis.cables) {
    const row = document.createElement("tr");
    const axisCell = document.createElement("th");
    axisCell.scope = "row";
    const dot = document.createElement("span");
    dot.className = `cable-dot ${tensionClass(
      cable.tensionN,
      analysis.minimumTensionN,
      analysis.maximumTensionN
    )}`;
    dot.setAttribute("aria-hidden", "true");
    axisCell.append(dot, document.createTextNode(` ${cable.id}축`));
    row.append(axisCell);

    appendCell(row, `${twoDecimals.format(cable.freeSpan)} m`);
    appendCell(row, `${twoDecimals.format(cable.totalUsedLength)} m`);
    appendCell(row, `${oneDecimal.format(cable.cableAngleDeg)}°`);
    appendCell(
      row,
      cable.tensionKgF === null
        ? "해 없음"
        : `${twoDecimals.format(cable.tensionKgF)} kgf`
    );
    cableTableBody.append(row);
  }
}

function drawLine(context, from, to, color, width = 1, dash = []) {
  context.beginPath();
  context.setLineDash(dash);
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
  context.setLineDash([]);
}

function drawPolygon(context, points, fill, stroke) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.stroke();
}

function cableColor(tensionN, minimumTensionN, maximumTensionN) {
  if (tensionN === null || maximumTensionN === null || minimumTensionN === null) {
    return "#78909c";
  }
  const span = maximumTensionN - minimumTensionN;
  if (span < 1e-6) return "#57d7ff";
  const ratio = (tensionN - minimumTensionN) / span;
  if (ratio > 0.75) return "#ff9a6a";
  if (ratio > 0.4) return "#ffc76a";
  return "#57d7ff";
}

function drawSimulation() {
  if (!currentInstallation || !currentPointAnalysis || !simulationCanvas) return;
  const context = simulationCanvas.getContext("2d");
  if (!context) return;

  const rect = simulationCanvas.getBoundingClientRect();
  const width = Math.max(280, rect.width);
  const height = Math.max(240, rect.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  simulationCanvas.width = Math.round(width * pixelRatio);
  simulationCanvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const installation = currentInstallation;
  const project = (point) => {
    const normalizedX = point.x / installation.width;
    const normalizedY = point.y / installation.length;
    const normalizedZ = point.z / installation.pulleyHeight;
    return {
      x: width * 0.5 + (normalizedX - normalizedY) * width * 0.58,
      y: height * 0.82 - (normalizedX + normalizedY) * height * 0.25 -
        normalizedZ * height * 0.58
    };
  };

  const bottomCorners = currentPointAnalysis.cables.map((cable) =>
    project({ x: cable.x, y: cable.y, z: 0 })
  );
  const topCorners = currentPointAnalysis.cables.map((cable) =>
    project({ x: cable.x, y: cable.y, z: cable.z })
  );
  const payload = project(currentPointAnalysis.point);

  drawPolygon(context, bottomCorners, "rgba(87, 215, 255, 0.035)", "rgba(156, 176, 188, 0.18)");
  drawPolygon(context, topCorners, "rgba(87, 215, 255, 0.025)", "rgba(87, 215, 255, 0.5)");
  for (let index = 0; index < 4; index += 1) {
    drawLine(
      context,
      bottomCorners[index],
      topCorners[index],
      "rgba(156, 176, 188, 0.2)",
      1,
      [4, 5]
    );
  }

  currentPointAnalysis.cables.forEach((cable, index) => {
    const color = cableColor(
      cable.tensionN,
      currentPointAnalysis.minimumTensionN,
      currentPointAnalysis.maximumTensionN
    );
    const maximum = currentPointAnalysis.maximumTensionN || 1;
    const relative = cable.tensionN === null ? 0 : cable.tensionN / maximum;
    drawLine(context, topCorners[index], payload, color, 2 + relative * 2);
  });

  context.font = "700 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  topCorners.forEach((point, index) => {
    context.beginPath();
    context.arc(point.x, point.y, 6, 0, Math.PI * 2);
    context.fillStyle = "#071018";
    context.fill();
    context.strokeStyle = "#57d7ff";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#cdeffc";
    context.fillText(String(index + 1), point.x, point.y - 15);
  });

  context.beginPath();
  context.arc(payload.x, payload.y, 9, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "#57d7ff";
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = "#dff7ff";
  context.fillText(
    `P (${oneDecimal.format(currentPointAnalysis.point.x)}, ${oneDecimal.format(currentPointAnalysis.point.y)}, ${oneDecimal.format(currentPointAnalysis.point.z)})`,
    payload.x,
    payload.y + 24
  );
}

function workspaceColor(status) {
  if (status === "operating") return "#39bd8b";
  if (status === "static-only") return "#d89d3c";
  return "#263c48";
}

function drawWorkspaceMap() {
  if (!currentInstallation || !currentWorkspaceMap || !workspaceCanvas) return;
  const context = workspaceCanvas.getContext("2d");
  if (!context) return;

  const rect = workspaceCanvas.getBoundingClientRect();
  const width = Math.max(280, rect.width);
  const height = Math.max(220, rect.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  workspaceCanvas.width = Math.round(width * pixelRatio);
  workspaceCanvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const resolution = currentWorkspaceMap.resolution;
  const cellWidth = width / resolution;
  const cellHeight = height / resolution;
  currentWorkspaceMap.cells.forEach((cell, index) => {
    const row = Math.floor(index / resolution);
    const column = index % resolution;
    context.fillStyle = workspaceColor(cell.status);
    context.fillRect(column * cellWidth, row * cellHeight, cellWidth + 0.7, cellHeight + 0.7);
  });

  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();

  if (currentPointAnalysis && Math.abs(currentPointAnalysis.point.z - currentWorkspaceMap.z) < 0.051) {
    const markerX = (currentPointAnalysis.point.x / currentInstallation.width + 0.5) * width;
    const markerY = (0.5 - currentPointAnalysis.point.y / currentInstallation.length) * height;
    context.beginPath();
    context.arc(markerX, markerY, 7, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "#071018";
    context.lineWidth = 3;
    context.stroke();
  }

  context.fillStyle = "rgba(255,255,255,0.78)";
  context.font = "700 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  context.textBaseline = "top";
  context.fillText("+Y", 8, 8);
  context.textAlign = "right";
  context.fillText("+X", width - 8, height / 2 + 8);
  context.textAlign = "left";
}

function renderWorkspaceMap() {
  if (!currentInstallation || !workspaceForm) return;
  const result = calculateWorkspaceMap(currentInstallation, readWorkspaceValues());
  currentWorkspaceMap = result;
  setOutput(workspaceOutputs, "z", oneDecimal.format(result.z));
  setOutput(
    workspaceOutputs,
    "staticFeasiblePercent",
    oneDecimal.format(result.staticFeasiblePercent)
  );
  setOutput(
    workspaceOutputs,
    "operatingFeasiblePercent",
    oneDecimal.format(result.operatingFeasiblePercent)
  );
  setOutput(workspaceOutputs, "loadCaseCount", wholeNumber.format(result.loadCaseCount));
  workspaceError.hidden = true;
  workspaceEmpty.hidden = true;
  workspaceContent.hidden = false;
  window.requestAnimationFrame(drawWorkspaceMap);
}

function renderPointAnalysis() {
  if (!currentInstallation) return;
  const analysis = calculatePointAnalysis(currentInstallation, readPointValues());
  currentPointAnalysis = analysis;

  setOutput(pointOutputs, "x", oneDecimal.format(analysis.point.x));
  setOutput(pointOutputs, "y", oneDecimal.format(analysis.point.y));
  setOutput(pointOutputs, "z", oneDecimal.format(analysis.point.z));
  setOutput(
    pointOutputs,
    "minimumCableAngleDeg",
    oneDecimal.format(analysis.minimumCableAngleDeg)
  );
  setOutput(
    pointOutputs,
    "maximumTensionKgF",
    analysis.maximumTensionN === null
      ? "해 없음"
      : oneDecimal.format(analysis.maximumTensionN / CRITERIA.gravity)
  );
  setOutput(
    pointOutputs,
    "tensionSpreadRatio",
    Number.isFinite(analysis.tensionSpreadRatio)
      ? oneDecimal.format(analysis.tensionSpreadRatio)
      : "∞"
  );

  updatePointAssessment(analysis);
  renderCableTable(analysis);
  pointError.hidden = true;
  simulationEmpty.hidden = true;
  simulationContent.hidden = false;
  hasCalculatedPoint = true;
  window.requestAnimationFrame(drawSimulation);
  if (currentWorkspaceMap) window.requestAnimationFrame(drawWorkspaceMap);
}

installationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!installationForm.checkValidity()) {
    installationError.hidden = false;
    installationForm.reportValidity();
    return;
  }

  try {
    renderInstallationResult();
  } catch (error) {
    installationError.textContent =
      error instanceof Error ? error.message : "입력값을 확인해 주세요.";
    installationError.hidden = false;
  }
});

installationForm.addEventListener("input", () => {
  installationError.hidden = true;
  if (hasCalculatedInstallation && installationForm.checkValidity()) {
    renderInstallationResult();
  }
});

installationForm.addEventListener("reset", () => {
  window.requestAnimationFrame(() => {
    currentInstallation = null;
    currentPointAnalysis = null;
    currentWorkspaceMap = null;
    hasCalculatedInstallation = false;
    hasCalculatedPoint = false;
    installationError.hidden = true;
    installationError.textContent = "입력값을 확인해 주세요.";
    resultContent.hidden = true;
    emptyState.hidden = false;
    if (pointFieldset) pointFieldset.disabled = true;
    if (simulationContent) simulationContent.hidden = true;
    if (simulationEmpty) simulationEmpty.hidden = false;
    if (workspaceFieldset) workspaceFieldset.disabled = true;
    if (workspaceContent) workspaceContent.hidden = true;
    if (workspaceEmpty) workspaceEmpty.hidden = false;
  });
});

if (pointForm) {
  pointForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pointForm.checkValidity()) {
      pointError.hidden = false;
      pointForm.reportValidity();
      return;
    }

    try {
      renderPointAnalysis();
    } catch (error) {
      pointError.textContent =
        error instanceof Error ? error.message : "좌표를 확인해 주세요.";
      pointError.hidden = false;
    }
  });

  pointForm.addEventListener("input", () => {
    pointError.hidden = true;
    if (hasCalculatedPoint && pointForm.checkValidity()) {
      try {
        renderPointAnalysis();
      } catch {
        // Keep the last valid simulation while a user is editing an incomplete value.
      }
    }
  });
}

if (centerPositionButton) {
  centerPositionButton.addEventListener("click", useCenterReferencePosition);
}

if (workspaceForm) {
  workspaceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!workspaceForm.checkValidity()) {
      workspaceError.hidden = false;
      workspaceForm.reportValidity();
      return;
    }
    try {
      renderWorkspaceMap();
    } catch (error) {
      workspaceError.textContent =
        error instanceof Error ? error.message : "맵 조건을 확인해 주세요.";
      workspaceError.hidden = false;
    }
  });

  workspaceForm.addEventListener("input", () => {
    workspaceError.hidden = true;
  });
}

if (usePointHeightButton) {
  usePointHeightButton.addEventListener("click", () => {
    if (!currentInstallation || !workspaceZ) return;
    workspaceZ.value = currentPointAnalysis
      ? currentPointAnalysis.point.z.toFixed(2)
      : currentInstallation.referenceHeight75.toFixed(2);
    try {
      renderWorkspaceMap();
    } catch (error) {
      workspaceError.textContent = error instanceof Error ? error.message : "맵 조건을 확인해 주세요.";
      workspaceError.hidden = false;
    }
  });
}

if (workspaceCanvas) {
  workspaceCanvas.addEventListener("click", (event) => {
    if (!currentInstallation || !currentWorkspaceMap || !pointX || !pointY || !pointZ) return;
    const rect = workspaceCanvas.getBoundingClientRect();
    const ratioX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const ratioY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    pointX.value = (-currentInstallation.width / 2 + ratioX * currentInstallation.width).toFixed(2);
    pointY.value = (currentInstallation.length / 2 - ratioY * currentInstallation.length).toFixed(2);
    pointZ.value = currentWorkspaceMap.z.toFixed(2);
    try {
      renderPointAnalysis();
    } catch (error) {
      pointError.textContent = error instanceof Error ? error.message : "좌표를 확인해 주세요.";
      pointError.hidden = false;
    }
  });
}

if (simulationCanvas && "ResizeObserver" in window) {
  new ResizeObserver(() => {
    if (currentPointAnalysis) window.requestAnimationFrame(drawSimulation);
  }).observe(simulationCanvas);
} else if (simulationCanvas) {
  window.addEventListener("resize", () => {
    if (currentPointAnalysis) window.requestAnimationFrame(drawSimulation);
  });
}

if (workspaceCanvas && "ResizeObserver" in window) {
  new ResizeObserver(() => {
    if (currentWorkspaceMap) window.requestAnimationFrame(drawWorkspaceMap);
  }).observe(workspaceCanvas);
} else if (workspaceCanvas) {
  window.addEventListener("resize", () => {
    if (currentWorkspaceMap) window.requestAnimationFrame(drawWorkspaceMap);
  });
}
