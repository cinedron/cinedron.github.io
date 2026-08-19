import { calculateInstallation, CRITERIA } from "./calculation.mjs";

const form = document.querySelector("#installation-form");
const formError = document.querySelector("#form-error");
const emptyState = document.querySelector("#result-empty");
const resultContent = document.querySelector("#result-content");
const assessment = document.querySelector("#height-assessment");
const assessmentTitle = document.querySelector("#assessment-title");
const assessmentCopy = document.querySelector("#assessment-copy");
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

const wholeNumber = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0
});

let hasCalculated = false;

function readValues() {
  const data = new FormData(form);
  return {
    width: Number(data.get("width")),
    length: Number(data.get("length")),
    pulleyHeight: Number(data.get("pulleyHeight")),
    payloadMass: Number(data.get("payloadMass"))
  };
}

function setOutput(name, value) {
  const element = outputs.get(name);
  if (element) {
    element.textContent = value;
  }
}

function updateAssessment(result) {
  assessment.className = "assessment";

  if (!result.conservativeHeightAvailable) {
    assessment.classList.add("assessment--danger");
    assessmentTitle.textContent = "현재 높이에서는 30° 참고 기준을 확보할 수 없습니다.";
    assessmentCopy.textContent =
      `페이로드가 바닥에 있어도 중앙 케이블 각도가 ${oneDecimal.format(result.selectedAngleDeg)}°입니다. ` +
      "도르래 높이를 높이거나 설치 면적을 줄여 다시 검토하세요.";
    return;
  }

  if (result.ratio75PassesAngleCriterion) {
    assessment.classList.add("assessment--ok");
    assessmentTitle.textContent = "75% 상한을 참고값으로 적용할 수 있는 형상입니다.";
    assessmentCopy.textContent =
      `75% 높이에서 중앙 케이블 각도는 ${oneDecimal.format(result.ratio75AngleDeg)}°로, ` +
      `${CRITERIA.minimumCableAngleDeg}° 계획 기준을 충족합니다.`;
    return;
  }

  assessment.classList.add("assessment--caution");
  assessmentTitle.textContent = "이 공간에서는 75% 높이가 과도하게 높은 참고값입니다.";
  assessmentCopy.textContent =
    `75% 높이에서 중앙 케이블 각도는 ${oneDecimal.format(result.ratio75AngleDeg)}°입니다. ` +
    `${CRITERIA.minimumCableAngleDeg}°를 확보하도록 최대 높이를 낮춰 표시했습니다.`;
}

function renderResult() {
  const result = calculateInstallation(readValues());

  setOutput("planningCableLength", oneDecimal.format(result.planningCableLength));
  setOutput("minimumCableLength", oneDecimal.format(result.minimumCableLength));
  setOutput("recommendedMaxHeight", oneDecimal.format(result.recommendedMaxHeight));
  setOutput("heightPercentage", oneDecimal.format(result.heightPercentage));
  setOutput("heightLimiter", result.heightLimiter);
  setOutput("maxFreeSpan", oneDecimal.format(result.maxFreeSpan));
  setOutput("floorDiagonal", oneDecimal.format(result.floorDiagonal));
  setOutput("selectedAngleDeg", oneDecimal.format(result.selectedAngleDeg));
  setOutput("staticTensionKgF", oneDecimal.format(result.staticTensionKgF));
  setOutput("staticTensionN", wholeNumber.format(result.staticTensionN));

  updateAssessment(result);
  formError.hidden = true;
  emptyState.hidden = true;
  resultContent.hidden = false;
  hasCalculated = true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    formError.hidden = false;
    form.reportValidity();
    return;
  }

  try {
    renderResult();
  } catch (error) {
    formError.textContent = error instanceof Error ? error.message : "입력값을 확인해 주세요.";
    formError.hidden = false;
  }
});

form.addEventListener("input", () => {
  formError.hidden = true;
  if (hasCalculated && form.checkValidity()) {
    renderResult();
  }
});

form.addEventListener("reset", () => {
  window.requestAnimationFrame(() => {
    hasCalculated = false;
    formError.hidden = true;
    formError.textContent = "입력값을 확인해 주세요.";
    resultContent.hidden = true;
    emptyState.hidden = false;
  });
});
