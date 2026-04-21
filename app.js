let currentProjection = null;
let currentImage = null;
let currentFileName = null;
let outputCanvasCache = null;
let globePreview = null;

function initializeApp() {
  const projectionSelect = document.getElementById('projectionSelect');
  const configContainer = document.getElementById('projectionConfig');
  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const fileChip = document.getElementById('fileChip');
  const fileChipName = document.getElementById('fileChipName');
  const replaceBtn = document.getElementById('replaceBtn');
  const allProjections = getAllProjections();

  allProjections.forEach(projection => {
    const option = document.createElement('option');
    option.value = projection.id;
    option.textContent = projection.name;
    projectionSelect.appendChild(option);
  });

  currentProjection = allProjections[0];
  currentProjection.renderConfig(configContainer, performConversion);

  projectionSelect.addEventListener('change', (e) => {
    currentProjection = getProjectionById(e.target.value);
    currentProjection.renderConfig(configContainer, performConversion);

    if (currentImage) {
      performConversion();
    }
  });

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    currentFileName = file.name;
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      currentImage = img;
      dropzone.style.display = 'none';
      fileChip.style.display = 'flex';
      fileChipName.textContent = currentFileName;
      document.getElementById('inputDims').textContent = `${img.width}\u00d7${img.height}`;
      performConversion();
    };
  }

  fileInput.addEventListener('change', (e) => {
    if (!e.target.files.length) return;

    loadFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.setAttribute('data-dragover', 'true');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.removeAttribute('data-dragover');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.removeAttribute('data-dragover');
    const f = e.dataTransfer.files[0];

    if (f) loadFile(f);
  });

  replaceBtn.addEventListener('click', () => {
    currentImage = null;
    currentFileName = null;
    outputCanvasCache = null;
    fileInput.value = '';
    dropzone.style.display = 'block';
    fileChip.style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('actionSection').style.display = 'none';
    hideGlobePreview();
  });

  document.getElementById('downloadBtn').addEventListener('click', downloadResult);
}

function getPreparedImage() {
  const config = currentProjection.getConfig();

  if (currentProjection.prepareImage) {
    return currentProjection.prepareImage(currentImage, config);
  }

  return currentImage;
}

function updateInputPreview() {
  if (!currentImage) return;

  const inputCanvas = document.getElementById('inputCanvas');
  const previewSection = document.getElementById('previewSection');
  const processedImage = getPreparedImage();

  const inputCtx = inputCanvas.getContext('2d');
  inputCanvas.width = processedImage.width;
  inputCanvas.height = processedImage.height;
  inputCtx.drawImage(processedImage, 0, 0);

  if (currentProjection.renderInputOverlay) {
    currentProjection.renderInputOverlay(inputCtx, processedImage.width, processedImage.height);
  }

  previewSection.style.display = 'grid';
}

function performConversion() {
  if (!currentImage) return;

  const inputOverlay = document.getElementById('inputOverlay');
  const outputOverlay = document.getElementById('outputOverlay');
  inputOverlay.style.display = 'flex';
  outputOverlay.style.display = 'flex';

  requestAnimationFrame(() => {
    if (currentProjection.showConfig) {
      currentProjection.showConfig();
      currentProjection._onInput = updateInputPreview;
    }

    const processedImage = getPreparedImage();

    updateInputPreview();

    const outputCanvas = document.getElementById('outputCanvas');
    const actionSection = document.getElementById('actionSection');

    outputCanvasCache = currentProjection.convert(processedImage);

    outputCanvas.width = outputCanvasCache.width;
    outputCanvas.height = outputCanvasCache.height;
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.drawImage(outputCanvasCache, 0, 0);

    actionSection.style.display = 'block';

    showGlobePreview(outputCanvasCache);

    inputOverlay.style.display = 'none';
    outputOverlay.style.display = 'none';
  });
}

function showGlobePreview(source) {
  const info = document.getElementById('globeInfo');
  const card = document.getElementById('globeCard');
  const canvas = document.getElementById('globeCanvas');

  info.style.display = 'none';
  card.style.display = 'block';

  if (!globePreview) {
    globePreview = createGlobePreview(canvas, source);
  } else {
    globePreview.setSource(source);
  }
}

function hideGlobePreview() {
  const info = document.getElementById('globeInfo');
  const card = document.getElementById('globeCard');
  info.style.display = 'block';
  card.style.display = 'none';

  if (globePreview) {
    globePreview.destroy();
    globePreview = null;
  }
}

function downloadResult() {
  if (!currentImage) return;

  const processedImage = getPreparedImage();
  const downloadBtn = document.getElementById('downloadBtn');
  const spinner = document.getElementById('downloadSpinner');
  const base = (currentFileName || 'map').replace(/\.[^/.]+$/, '');
  const downloadName = `${base}-equirectangular.png`;

  if (currentProjection.convertFullRes) {
    downloadBtn.disabled = true;
    spinner.style.display = 'flex';

    currentProjection.convertFullRes(processedImage).then(function(canvas) {
      canvas.toBlob(function(blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = downloadName;
        a.click();
        downloadBtn.disabled = false;
        spinner.style.display = 'none';
      }, 'image/png');
    }).catch(function(err) {
      console.error('Conversion failed:', err);
      downloadBtn.disabled = false;
      spinner.style.display = 'none';
    });
  } else {
    outputCanvasCache.toBlob(function(blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = downloadName;
      a.click();
    }, 'image/png');
  }
}

initializeApp();
