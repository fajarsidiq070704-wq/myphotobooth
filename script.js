const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const download = document.getElementById("download");
const countdownText = document.getElementById("countdown");
const framePicker = document.getElementById("framePicker");
const frameSelect = document.getElementById("frameSelect");
const startCameraButton = document.getElementById("startCamera");
const takePhotoButton = document.getElementById("takePhoto");

const context = canvas.getContext("2d");
const frameImage = new Image();

const DEFAULT_CANVAS_WIDTH = 360;
const DEFAULT_CANVAS_HEIGHT = 640;

let currentStream = null;
let currentFrameName = frameSelect.value || "";
const uploadedFrames = new Map();

const frameConfigs = {
  default: {
    slots: [
      { x: 0.105, y: 0.03, w: 0.785, h: 0.18 },
      { x: 0.105, y: 0.23, w: 0.785, h: 0.18 },
      { x: 0.105, y: 0.43, w: 0.785, h: 0.18 },
      { x: 0.105, y: 0.63, w: 0.785, h: 0.18 }
    ]
  }
};

function setCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
}

function drawFrameOnly() {
  if (!frameImage.src) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
}

function getFrameConfig(name) {
  return frameConfigs[name] || frameConfigs.default;
}

function drawImageCover(ctx, media, dx, dy, dWidth, dHeight) {
  const sw = media.videoWidth;
  const sh = media.videoHeight;

  if (!sw || !sh) return;

  const srcRatio = sw / sh;
  const destRatio = dWidth / dHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = sw;
  let sHeight = sh;

  if (srcRatio > destRatio) {
    sWidth = sh * destRatio;
    sx = (sw - sWidth) / 2;
  } else {
    sHeight = sw / destRatio;
    sy = (sh - sHeight) / 2;
  }

  ctx.drawImage(media, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

async function countdown() {
  for (let i = 3; i > 0; i -= 1) {
    countdownText.innerText = i;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  countdownText.innerText = "";
}

async function startCamera() {
  if (currentStream) return;

  currentStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });

  video.srcObject = currentStream;

  await new Promise((resolve) => {
    video.onloadedmetadata = resolve;
  });

  await video.play();
}

async function takeMultiplePhotos() {
  if (!currentStream) {
    await startCamera();
  }

  if (!frameImage.src) {
    alert("Upload atau pilih frame dulu.");
    return;
  }

  const { slots } = getFrameConfig(currentFrameName);

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const slot of slots) {
    await countdown();

    drawImageCover(
      context,
      video,
      canvas.width * slot.x,
      canvas.height * slot.y,
      canvas.width * slot.w,
      canvas.height * slot.h
    );
  }

  context.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  download.href = canvas.toDataURL("image/png");
}

function addFrameOption(name, url) {
  uploadedFrames.set(name, url);

  const exists = Array.from(frameSelect.options).some(
    (option) => option.value === name
  );

  if (!exists) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    frameSelect.appendChild(option);
  }
}

function loadSelectedFrame(name) {
  const frameUrl = uploadedFrames.get(name);
  currentFrameName = name;
  frameImage.src = frameUrl || name;
}

frameImage.onload = () => {
  setCanvasSize(frameImage.width, frameImage.height);
  drawFrameOnly();
};

framePicker.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);

  for (const file of files) {
    const frameUrl = URL.createObjectURL(file);
    addFrameOption(file.name, frameUrl);

    if (!frameConfigs[file.name]) {
      frameConfigs[file.name] = frameConfigs.default;
    }
  }

  if (files.length > 0) {
    frameSelect.value = files[0].name;
    loadSelectedFrame(files[0].name);
  }
});

frameSelect.addEventListener("change", (event) => {
  loadSelectedFrame(event.target.value);
});

startCameraButton.addEventListener("click", async () => {
  try {
    await startCamera();
  } catch (error) {
    alert("Kamera gagal dibuka. Pastikan izin kamera diaktifkan.");
    console.error(error);
  }
});

takePhotoButton.addEventListener("click", async () => {
  try {
    await takeMultiplePhotos();
  } catch (error) {
    alert("Gagal mengambil foto.");
    console.error(error);
  }
});

download.addEventListener("click", (event) => {
  if (!download.href || download.href.endsWith("#")) {
    event.preventDefault();
    alert("Ambil foto dulu sebelum download.");
  }
});

setCanvasSize(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

if (currentFrameName) {
  loadSelectedFrame(currentFrameName);
}
