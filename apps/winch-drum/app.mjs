import { calculateDrumCapacity } from "./calculation.mjs?v=20260819-drum1";

const form = document.querySelector("#drum-form");
const errorMessage = document.querySelector("#drum-error");
const emptyState = document.querySelector("#drum-empty");
const resultContent = document.querySelector("#drum-result");
const layerSection = document.querySelector("#layer-section");
const layerTableBody = document.querySelector("#layer-table-body");
const assessment = document.querySelector("#drum-assessment");
const assessmentTitle = document.querySelector("#drum-assessment-title");
const assessmentCopy = document.querySelector("#drum-assessment-copy");
const outputs = new Map(
  Array.from(document.querySelectorAll("[data-output]"), (element) => [
    element.dataset.output,
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
const wholeNumber = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

let hasCalculated = false;

function setOutput(name, value) {
  const element = outputs.get(name);
  if (element) element.textContent = value;
}

function readValues() {
  const data = new FormData(form);
  return {
    ropeDiameter: Number(data.get("ropeDiameter")),
    coreDiameter: Number(data.get("coreDiameter")),
    flangeDiameter: Number(data.get("flangeDiameter")),
    drumWidth: Number(data.get("drumWidth")),
    freeboard: Number(data.get("freeboard")),
    deadWraps: Number(data.get("deadWraps")),
    planningEfficiency: Number(data.get("planningEfficiency")) / 100,
    requiredLength: Number(data.get("requiredLength")),
    leadDistance: Number(data.get("leadDistance")),
    drumType: String(data.get("drumType")),
    firstLayerLinePull: Number(data.get("firstLayerLinePull"))
  };
}

function appendCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.append(cell);
}

function renderLayers(result) {
  layerTableBody.replaceChildren();
  for (const layer of result.layers) {
    const row = document.createElement("tr");
    const layerCell = document.createElement("th");
    layerCell.scope = "row";
    layerCell.textContent = `${layer.layer}층`;
    row.append(layerCell);
    appendCell(row, `${oneDecimal.format(layer.centerlineDiameter)} mm`);
    appendCell(row, `${twoDecimals.format(layer.layerLength)} m`);
    appendCell(row, `${twoDecimals.format(layer.cumulativeLength)} m`);
    appendCell(row, `${oneDecimal.format(layer.linePullRatio * 100)}%`);
    appendCell(
      row,
      layer.estimatedLinePull === null
        ? "입력 없음"
        : `${oneDecimal.format(layer.estimatedLinePull)} kgf`
    );
    layerTableBody.append(row);
  }
}

function updateAssessment(result, values) {
  assessment.className = "assessment";
  const capacityText = result.targetFits
    ? `계획 용량 안에 ${oneDecimal.format(result.targetDifference)}m의 여유가 있습니다.`
    : `계획 용량보다 ${oneDecimal.format(Math.abs(result.targetDifference))}m 부족합니다.`;
  const fleetText = result.fleetAngleWithinRecommendedRange
    ? `플리트 각도는 ${oneDecimal.format(result.fleetAngleMinimumDeg)}–${oneDecimal.format(result.fleetAngleMaximumDeg)}° 참고범위 안입니다.`
    : result.fleetAngleWithinMaximum
      ? `플리트 각도가 ${oneDecimal.format(result.fleetAngleMinimumDeg)}°보다 작아 권취 유도 방식을 확인해야 합니다.`
      : `플리트 각도가 ${oneDecimal.format(result.fleetAngleMaximumDeg)}° 참고 상한을 초과합니다.`;

  if (result.targetFits && result.fleetAngleWithinRecommendedRange) {
    assessment.classList.add("assessment--ok");
    assessmentTitle.textContent = "입력한 길이와 플리트 각도가 현재 계획 조건 안에 있습니다.";
  } else if (!result.targetFits && !result.fleetAngleWithinRecommendedRange) {
    assessment.classList.add("assessment--danger");
    assessmentTitle.textContent = "드럼 용량과 첫 도르래 배치를 모두 다시 검토해야 합니다.";
  } else {
    assessment.classList.add("assessment--caution");
    assessmentTitle.textContent = result.targetFits
      ? "드럼 용량은 들어가지만 플리트 각도 조건을 확인해야 합니다."
      : "플리트 각도는 상한 이내지만 계획 권취 용량이 부족합니다.";
  }
  assessmentCopy.textContent = `${capacityText} ${fleetText} 제조사 매뉴얼의 실제 권취 조건을 우선하세요.`;

  setOutput(
    "targetResult",
    values.requiredLength <= 0
      ? "비교 길이 없음"
      : result.targetFits
        ? `수용 가능 · ${result.requiredLayers}층 필요`
        : `${oneDecimal.format(Math.abs(result.targetDifference))}m 부족`
  );
}

function render() {
  const values = readValues();
  const result = calculateDrumCapacity(values);
  setOutput("planningCapacity", oneDecimal.format(result.planningCapacity));
  setOutput("planningEfficiency", wholeNumber.format(values.planningEfficiency * 100));
  setOutput("fleetAngleDeg", twoDecimals.format(result.fleetAngleDeg));
  setOutput("drumTypeLabel", values.drumType === "smooth" ? "평드럼" : "홈드럼");
  setOutput("fleetAngleMinimumDeg", oneDecimal.format(result.fleetAngleMinimumDeg));
  setOutput("fleetAngleMaximumDeg", oneDecimal.format(result.fleetAngleMaximumDeg));
  setOutput("totalStorageCapacity", oneDecimal.format(result.totalStorageCapacity));
  setOutput("totalWorkingCapacity", oneDecimal.format(result.totalWorkingCapacity));
  setOutput("maximumLayers", wholeNumber.format(result.maximumLayers));
  setOutput("wrapsPerLayer", wholeNumber.format(result.wrapsPerLayer));
  setOutput("minimumLeadDistance", wholeNumber.format(result.recommendedMinimumLeadDistance));
  setOutput("maximumLeadDistance", wholeNumber.format(result.recommendedMaximumLeadDistance));
  setOutput("ddRatio", oneDecimal.format(result.ddRatio));
  updateAssessment(result, values);
  renderLayers(result);
  errorMessage.hidden = true;
  emptyState.hidden = true;
  resultContent.hidden = false;
  layerSection.hidden = false;
  hasCalculated = true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    errorMessage.hidden = false;
    form.reportValidity();
    return;
  }
  try {
    render();
  } catch (error) {
    errorMessage.textContent = error instanceof Error ? error.message : "입력값을 확인해 주세요.";
    errorMessage.hidden = false;
  }
});

form.addEventListener("input", () => {
  errorMessage.hidden = true;
  if (hasCalculated && form.checkValidity()) {
    try {
      render();
    } catch {
      // 입력 도중에는 마지막으로 유효했던 결과를 유지합니다.
    }
  }
});

form.addEventListener("reset", () => {
  window.requestAnimationFrame(() => {
    hasCalculated = false;
    errorMessage.hidden = true;
    errorMessage.textContent = "입력값을 확인해 주세요.";
    resultContent.hidden = true;
    emptyState.hidden = false;
    layerSection.hidden = true;
  });
});
