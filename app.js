const exercises = [
  4, 5, 6, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  49, 50, 51, 52, 53, 54, 56, 57, 58, 59,
  71, 72, 73, 74, 75, 77, 78, 79, 80, 81
];

const missingQuestionIds = new Set([9, 54, 80]);
const API_BASE_URL = "http://127.0.0.1:8000";
const $ = (selector) => document.querySelector(selector);

const ui = {
  setSelect: $("#setSelect"),
  pictureHeading: $("#pictureHeading"),
  pictureImage: $("#pictureImage"),
  pictureFrame: $("#pictureFrame"),
  positionLabel: $("#positionLabel"),
  previousButton: $("#previousButton"),
  nextButton: $("#nextButton"),
  questionBadge: $("#questionBadge"),
  questionAvailable: $("#questionAvailable"),
  missingQuestion: $("#missingQuestion"),
  missingFilename: $("#missingFilename"),
  revealButton: $("#revealButton"),
  questionImageWrap: $("#questionImageWrap"),
  questionImage: $("#questionImage"),
  ocrButton: $("#ocrButton"),
  ocrStatus: $("#ocrStatus"),
  questionText: $("#questionText"),
  voiceSelect: $("#voiceSelect"),
  rateInput: $("#rateInput"),
  rateOutput: $("#rateOutput"),
  autoReadInput: $("#autoReadInput"),
  questionSpeakButtons: [...document.querySelectorAll(".question-speak-button")],
  stopButton: $("#stopButton"),
  fullscreenButton: $("#fullscreenButton"),
  lightbox: $("#lightbox"),
  lightboxImage: $("#lightboxImage"),
  closeLightbox: $("#closeLightbox")
};

let currentIndex = 0;
let ocrWorker = null;
let ocrScriptPromise = null;
let saveTimer = null;
let loadGeneration = 0;
let activeUtterance = null;

function fileUrl(name) {
  return encodeURI(`image/${name}`);
}

function currentId() {
  return exercises[currentIndex];
}

async function loadSavedQuestion(id) {
  const response = await fetch(`${API_BASE_URL}/api/questions/${id}`);
  if (!response.ok) throw new Error("Không tải được nội dung đã lưu.");
  const data = await response.json();

  // Chuyển dữ liệu cũ từ localStorage lên hệ thống một lần, nếu có.
  const legacyKey = `jpd123-question-b-${id}`;
  const legacyText = localStorage.getItem(legacyKey);
  if (!data.text && legacyText) {
    await saveQuestion(id, legacyText);
    localStorage.removeItem(legacyKey);
    return legacyText;
  }
  return data.text || "";
}

async function saveQuestion(id, text, showStatus = true) {
  const response = await fetch(`${API_BASE_URL}/api/questions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error("Không lưu được nội dung lên hệ thống.");
  if (showStatus && id === currentId()) {
    ui.ocrStatus.textContent = "Đã lưu trên hệ thống.";
  }
}

async function selectExercise(index, options = {}) {
  const generation = ++loadGeneration;
  currentIndex = (index + exercises.length) % exercises.length;
  const id = currentId();
  const label = `B-${id}`;
  const hasQuestion = !missingQuestionIds.has(id);

  speechSynthesis.cancel();
  ui.setSelect.value = String(id);
  ui.pictureHeading.textContent = label;
  ui.questionBadge.textContent = label;
  ui.pictureImage.src = fileUrl(`${label}.jpg`);
  ui.pictureImage.alt = `Tranh của bộ đề ${label}`;
  ui.positionLabel.textContent = `${currentIndex + 1} / ${exercises.length}`;
  ui.previousButton.disabled = currentIndex === 0;
  ui.nextButton.disabled = currentIndex === exercises.length - 1;

  ui.questionAvailable.hidden = !hasQuestion;
  ui.missingQuestion.hidden = hasQuestion;
  ui.questionImageWrap.hidden = true;
  ui.revealButton.innerHTML = eyeIcon() + "Hiện ảnh câu hỏi";
  ui.ocrStatus.textContent = "";

  if (hasQuestion) {
    ui.questionImage.src = fileUrl(`${label} Câu hỏi.jpg`);
    ui.questionImage.alt = `Ảnh câu hỏi của bộ đề ${label}`;
    ui.questionText.value = "";
    updateQuestionSpeakButtons();
    ui.questionText.disabled = true;
    ui.questionText.placeholder = "Đang tải nội dung đã lưu…";
    try {
      const savedText = await loadSavedQuestion(id);
      if (generation !== loadGeneration) return;
      ui.questionText.value = savedText;
      updateQuestionSpeakButtons();
      ui.ocrStatus.textContent = savedText ? "Đã tải nội dung từ hệ thống." : "";
      if (options.autoSpeak && ui.autoReadInput.checked && savedText.trim()) {
        speakQuestion();
      }
    } catch (error) {
      if (generation === loadGeneration) ui.ocrStatus.textContent = error.message;
    } finally {
      if (generation === loadGeneration) {
        ui.questionText.disabled = false;
        ui.questionText.placeholder = "Bấm “Nhận chữ từ ảnh”, hoặc nhập câu hỏi tiếng Nhật tại đây…";
      }
    }
  } else {
    ui.missingFilename.textContent = `${label} Câu hỏi.jpg`;
    ui.questionText.value = "";
    updateQuestionSpeakButtons();
  }

  document.title = `${label} · Luyện nói JPD123`;
}

function eyeIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
}

function loadOcrScript() {
  if (window.Tesseract) return Promise.resolve();
  if (ocrScriptPromise) return ocrScriptPromise;

  ocrScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Không tải được bộ nhận diện chữ."));
    document.head.appendChild(script);
  });
  return ocrScriptPromise;
}

async function recognizeQuestion() {
  ui.ocrButton.disabled = true;
  ui.ocrStatus.textContent = "Đang chuẩn bị nhận diện tiếng Nhật…";

  try {
    await loadOcrScript();
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker("jpn", 1, {
        logger: ({ status, progress }) => {
          const labels = {
            "loading tesseract core": "Đang tải bộ OCR",
            "initializing tesseract": "Đang khởi tạo OCR",
            "loading language traineddata": "Đang tải dữ liệu tiếng Nhật",
            "initializing api": "Đang chuẩn bị tiếng Nhật",
            "recognizing text": "Đang đọc chữ trong ảnh"
          };
          const percent = Number.isFinite(progress) ? ` ${Math.round(progress * 100)}%` : "";
          ui.ocrStatus.textContent = `${labels[status] || "Đang xử lý"}${percent}…`;
        }
      });
      await ocrWorker.setParameters({ preserve_interword_spaces: "1" });
    }

    const result = await ocrWorker.recognize(ui.questionImage.src);
    const cleaned = result.data.text
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    ui.questionText.value = cleaned;
    updateQuestionSpeakButtons();
    await saveQuestion(currentId(), cleaned, false);
    ui.ocrStatus.textContent = cleaned
      ? "Đã nhận chữ và lưu trên hệ thống. Bạn có thể sửa lại trước khi nghe."
      : "Chưa nhận được chữ rõ ràng. Hãy nhập câu hỏi thủ công.";
  } catch (error) {
    ui.ocrStatus.textContent = `${error.message} Hãy kiểm tra Internet hoặc nhập câu hỏi thủ công.`;
  } finally {
    ui.ocrButton.disabled = false;
  }
}

function populateVoices() {
  const voices = speechSynthesis.getVoices();
  const japanese = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
  const choices = japanese.length ? japanese : voices;
  const oldValue = ui.voiceSelect.value;

  ui.voiceSelect.innerHTML = "";
  if (!choices.length) {
    ui.voiceSelect.add(new Option("Giọng mặc định của máy", ""));
    return;
  }
  choices.forEach((voice) => {
    ui.voiceSelect.add(new Option(`${voice.name} (${voice.lang})`, voice.voiceURI));
  });
  if ([...ui.voiceSelect.options].some((option) => option.value === oldValue)) {
    ui.voiceSelect.value = oldValue;
  }
}

function getQuestionParts() {
  const lines = ui.questionText.value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 3) return lines;

  const parts = [];
  let currentPart = "";
  for (const line of lines) {
    currentPart = currentPart ? `${currentPart} ${line}` : line;
    if (/[。！？?!]$/.test(line) && parts.length < 2) {
      parts.push(currentPart);
      currentPart = "";
    }
  }
  if (currentPart) parts.push(currentPart);

  return parts.length === 3
    ? parts
    : [lines[0], lines[1], lines.slice(2).join(" ")];
}

function updateQuestionSpeakButtons() {
  const questionCount = getQuestionParts().length;
  ui.questionSpeakButtons.forEach((button, index) => {
    button.disabled = index >= questionCount;
  });
}

function speakQuestion(questionIndex) {
  const questionParts = getQuestionParts();
  const text = questionIndex === undefined
    ? ui.questionText.value.trim()
    : questionParts[questionIndex];
  if (!text) {
    ui.ocrStatus.textContent = questionIndex === undefined
      ? "Chưa có nội dung để đọc."
      : `Chưa có nội dung cho câu ${questionIndex + 1}.`;
    ui.questionText.focus();
    return;
  }

  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    ui.ocrStatus.textContent = "Trình duyệt này không hỗ trợ chức năng đọc văn bản.";
    return;
  }

  speechSynthesis.cancel();
  speechSynthesis.resume();
  activeUtterance = new SpeechSynthesisUtterance(text);
  activeUtterance.lang = "ja-JP";
  activeUtterance.rate = Number(ui.rateInput.value);
  const selectedVoice = speechSynthesis.getVoices().find(
    (voice) => voice.voiceURI === ui.voiceSelect.value
  );
  if (selectedVoice) activeUtterance.voice = selectedVoice;

  const utterance = activeUtterance;
  utterance.onstart = () => {
    ui.ocrStatus.textContent = questionIndex === undefined
      ? "Đang tự đọc các câu hỏi…"
      : `Đang đọc câu ${questionIndex + 1}…`;
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
      ui.ocrStatus.textContent = "Đã đọc xong.";
    }
  };
  utterance.onerror = (event) => {
    if (activeUtterance !== utterance || event.error === "canceled") return;
    activeUtterance = null;
    ui.ocrStatus.textContent = "Không thể phát giọng đọc. Hãy kiểm tra âm lượng hoặc thử chọn giọng khác.";
  };
  speechSynthesis.speak(utterance);
}

function openLightbox(image) {
  ui.lightboxImage.src = image.src;
  ui.lightboxImage.alt = image.alt;
  ui.lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  ui.lightbox.hidden = true;
  ui.lightboxImage.src = "";
  document.body.style.overflow = "";
}

exercises.forEach((id) => ui.setSelect.add(new Option(`B-${id}`, String(id))));
ui.setSelect.addEventListener("change", () => {
  selectExercise(exercises.indexOf(Number(ui.setSelect.value)), { autoSpeak: true });
});
ui.previousButton.addEventListener("click", () => selectExercise(currentIndex - 1, { autoSpeak: true }));
ui.nextButton.addEventListener("click", () => selectExercise(currentIndex + 1, { autoSpeak: true }));

ui.revealButton.addEventListener("click", () => {
  const willShow = ui.questionImageWrap.hidden;
  ui.questionImageWrap.hidden = !willShow;
  ui.revealButton.innerHTML = eyeIcon() + (willShow ? "Ẩn ảnh câu hỏi" : "Hiện ảnh câu hỏi");
});

ui.ocrButton.addEventListener("click", recognizeQuestion);
ui.questionSpeakButtons.forEach((button) => {
  button.addEventListener("click", () => speakQuestion(Number(button.dataset.questionIndex)));
});
ui.stopButton.addEventListener("click", () => {
  speechSynthesis.cancel();
  activeUtterance = null;
  ui.ocrStatus.textContent = "Đã dừng đọc.";
});
ui.rateInput.addEventListener("input", () => {
  ui.rateOutput.textContent = `${Number(ui.rateInput.value).toFixed(1)}×`;
});
ui.questionText.addEventListener("input", () => {
  updateQuestionSpeakButtons();
  clearTimeout(saveTimer);
  const id = currentId();
  const text = ui.questionText.value;
  ui.ocrStatus.textContent = "Đang chờ lưu…";
  saveTimer = setTimeout(() => {
    saveQuestion(id, text).catch((error) => {
      if (id === currentId()) ui.ocrStatus.textContent = error.message;
    });
  }, 500);
});

ui.fullscreenButton.addEventListener("click", () => openLightbox(ui.pictureImage));
ui.pictureFrame.addEventListener("dblclick", () => openLightbox(ui.pictureImage));
ui.questionImage.addEventListener("click", () => openLightbox(ui.questionImage));
ui.closeLightbox.addEventListener("click", closeLightbox);
ui.lightbox.addEventListener("click", (event) => {
  if (event.target === ui.lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ui.lightbox.hidden) closeLightbox();
  if (event.key === "ArrowLeft" && ui.lightbox.hidden && currentIndex > 0) {
    selectExercise(currentIndex - 1, { autoSpeak: true });
  }
  if (event.key === "ArrowRight" && ui.lightbox.hidden && currentIndex < exercises.length - 1) {
    selectExercise(currentIndex + 1, { autoSpeak: true });
  }
});

populateVoices();
speechSynthesis.addEventListener("voiceschanged", populateVoices);
selectExercise(0);
