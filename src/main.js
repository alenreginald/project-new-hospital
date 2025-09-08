class ImageFilterApp {
  constructor() {
    this.canvas = document.getElementById('imageCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.currentImage = null;
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      blur: 0,
      'hue-rotate': 0,
      temperature: 0,
      tint: 0,
      vibrance: 100,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      vignette: 0
    };
    this.zoom = 1;
    this.previewMode = true;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.imagePosition = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabSwitching();
    this.setupSliders();
    this.setupPresets();
  }

  setupEventListeners() {
    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');

    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
    uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    uploadArea.addEventListener('drop', this.handleDrop.bind(this));
    imageInput.addEventListener('change', this.handleFileSelect.bind(this));

    // Controls
    document.getElementById('zoomIn').addEventListener('click', () => this.adjustZoom(0.1));
    document.getElementById('zoomOut').addEventListener('click', () => this.adjustZoom(-0.1));
    document.getElementById('togglePreview').addEventListener('click', this.togglePreview.bind(this));
    document.getElementById('resetBtn').addEventListener('click', this.resetFilters.bind(this));
    document.getElementById('downloadBtn').addEventListener('click', this.downloadImage.bind(this));

    // Canvas interactions
    this.canvas.addEventListener('mousedown', this.startDrag.bind(this));
    this.canvas.addEventListener('mousemove', this.drag.bind(this));
    this.canvas.addEventListener('mouseup', this.endDrag.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
  }

  setupTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const filterPanels = document.querySelectorAll('.filter-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active panel
        filterPanels.forEach(panel => {
          panel.classList.remove('active');
          if (panel.id === targetTab) {
            panel.classList.add('active');
          }
        });
      });
    });
  }

  setupSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
      const valueSpan = slider.parentElement.querySelector('.slider-value');
      
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const filterId = e.target.id;
        
        this.filters[filterId] = value;
        this.updateSliderValue(slider, valueSpan, value);
        this.applyFilters();
      });
      
      // Initialize slider values
      const initialValue = this.filters[slider.id] || parseFloat(slider.value);
      this.updateSliderValue(slider, valueSpan, initialValue);
    });
  }

  updateSliderValue(slider, valueSpan, value) {
    const filterId = slider.id;
    let displayValue = value;
    let unit = '';

    switch (filterId) {
      case 'brightness':
      case 'contrast':
      case 'saturate':
      case 'vibrance':
      case 'grayscale':
      case 'sepia':
      case 'invert':
      case 'vignette':
        unit = '%';
        break;
      case 'blur':
        unit = 'px';
        break;
      case 'hue-rotate':
        unit = '°';
        break;
      case 'temperature':
      case 'tint':
        unit = '';
        break;
    }

    valueSpan.textContent = `${displayValue}${unit}`;
  }

  setupPresets() {
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        this.applyPreset(preset);
      });
    });
  }

  applyPreset(preset) {
    const presets = {
      vintage: {
        brightness: 110,
        contrast: 120,
        saturate: 80,
        sepia: 30,
        temperature: 20,
        vignette: 25
      },
      cinematic: {
        brightness: 90,
        contrast: 140,
        saturate: 110,
        temperature: -10,
        tint: 5,
        vignette: 15
      },
      warm: {
        brightness: 105,
        contrast: 110,
        saturate: 120,
        temperature: 30,
        tint: -5
      },
      cool: {
        brightness: 95,
        contrast: 105,
        saturate: 90,
        temperature: -25,
        tint: 10
      },
      dramatic: {
        brightness: 80,
        contrast: 160,
        saturate: 130,
        vignette: 40
      },
      soft: {
        brightness: 115,
        contrast: 85,
        saturate: 90,
        blur: 0.5,
        temperature: 10
      }
    };

    if (presets[preset]) {
      // Reset filters first
      this.resetFilters(false);
      
      // Apply preset values
      Object.entries(presets[preset]).forEach(([key, value]) => {
        this.filters[key] = value;
        const slider = document.getElementById(key);
        if (slider) {
          slider.value = value;
          const valueSpan = slider.parentElement.querySelector('.slider-value');
          this.updateSliderValue(slider, valueSpan, value);
        }
      });
      
      this.applyFilters();
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0]);
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.loadImage(file);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.currentImage = img;
        this.setupCanvas();
        this.showImageContainer();
        this.enableControls();
        this.applyFilters();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setupCanvas() {
    const container = document.querySelector('.image-wrapper');
    const containerRect = container.getBoundingClientRect();
    
    // Calculate optimal canvas size
    const maxWidth = containerRect.width - 40;
    const maxHeight = containerRect.height - 40;
    
    const imgAspect = this.originalImage.width / this.originalImage.height;
    const containerAspect = maxWidth / maxHeight;
    
    let canvasWidth, canvasHeight;
    
    if (imgAspect > containerAspect) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / imgAspect;
    } else {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imgAspect;
    }
    
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
    
    // Reset position and zoom
    this.zoom = 1;
    this.imagePosition = { x: 0, y: 0 };
    this.updateZoomDisplay();
  }

  showImageContainer() {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('imageContainer').style.display = 'flex';
  }

  enableControls() {
    document.getElementById('resetBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;
  }

  applyFilters() {
    if (!this.originalImage) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply CSS filters for real-time performance
    let filterString = '';
    
    if (this.filters.brightness !== 100) {
      filterString += `brightness(${this.filters.brightness}%) `;
    }
    if (this.filters.contrast !== 100) {
      filterString += `contrast(${this.filters.contrast}%) `;
    }
    if (this.filters.saturate !== 100) {
      filterString += `saturate(${this.filters.saturate}%) `;
    }
    if (this.filters.blur > 0) {
      filterString += `blur(${this.filters.blur}px) `;
    }
    if (this.filters['hue-rotate'] !== 0) {
      filterString += `hue-rotate(${this.filters['hue-rotate']}deg) `;
    }
    if (this.filters.grayscale > 0) {
      filterString += `grayscale(${this.filters.grayscale}%) `;
    }
    if (this.filters.sepia > 0) {
      filterString += `sepia(${this.filters.sepia}%) `;
    }
    if (this.filters.invert > 0) {
      filterString += `invert(${this.filters.invert}%) `;
    }

    this.ctx.filter = filterString || 'none';
    
    // Draw the image
    this.ctx.drawImage(this.originalImage, 0, 0);
    
    // Apply custom filters that require pixel manipulation
    this.applyCustomFilters();
    
    // Apply vignette effect
    if (this.filters.vignette > 0) {
      this.applyVignette();
    }
  }

  applyCustomFilters() {
    if (this.filters.temperature === 0 && this.filters.tint === 0 && this.filters.vibrance === 100) {
      return;
    }

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Temperature adjustment
      if (this.filters.temperature !== 0) {
        const temp = this.filters.temperature / 100;
        if (temp > 0) {
          r = Math.min(255, r + temp * 30);
          g = Math.min(255, g + temp * 10);
        } else {
          b = Math.min(255, b - temp * 30);
          g = Math.min(255, g - temp * 10);
        }
      }

      // Tint adjustment
      if (this.filters.tint !== 0) {
        const tint = this.filters.tint / 100;
        if (tint > 0) {
          g = Math.min(255, g + tint * 20);
        } else {
          r = Math.min(255, r - tint * 20);
        }
      }

      // Vibrance adjustment
      if (this.filters.vibrance !== 100) {
        const vibrance = (this.filters.vibrance - 100) / 100;
        const max = Math.max(r, g, b);
        const avg = (r + g + b) / 3;
        const amt = (Math.abs(max - avg) * 2 / 255) * vibrance;
        
        if (r !== max) r += (max - r) * amt;
        if (g !== max) g += (max - g) * amt;
        if (b !== max) b += (max - b) * amt;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  applyVignette() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );
    
    const intensity = this.filters.vignette / 100;
    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(0.6, `rgba(0, 0, 0, ${intensity * 0.1})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.8})`);
    
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over';
  }

  adjustZoom(delta) {
    this.zoom = Math.max(0.1, Math.min(3, this.zoom + delta));
    this.canvas.style.transform = `scale(${this.zoom}) translate(${this.imagePosition.x}px, ${this.imagePosition.y}px)`;
    this.updateZoomDisplay();
  }

  updateZoomDisplay() {
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
  }

  togglePreview() {
    this.previewMode = !this.previewMode;
    const btn = document.getElementById('togglePreview');
    
    if (this.previewMode) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fas fa-eye"></i> Preview';
      this.applyFilters();
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-eye-slash"></i> Original';
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.filter = 'none';
      this.ctx.drawImage(this.originalImage, 0, 0);
    }
  }

  resetFilters(updateSliders = true) {
    // Reset filter values
    Object.keys(this.filters).forEach(key => {
      switch (key) {
        case 'brightness':
        case 'contrast':
        case 'saturate':
        case 'vibrance':
          this.filters[key] = 100;
          break;
        default:
          this.filters[key] = 0;
      }
    });

    if (updateSliders) {
      // Update sliders
      const sliders = document.querySelectorAll('.slider');
      sliders.forEach(slider => {
        const filterId = slider.id;
        const value = this.filters[filterId];
        slider.value = value;
        const valueSpan = slider.parentElement.querySelector('.slider-value');
        this.updateSliderValue(slider, valueSpan, value);
      });
    }

    this.applyFilters();
  }

  startDrag(e) {
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  drag(e) {
    if (!this.isDragging) return;
    
    const deltaX = (e.clientX - this.dragStart.x) / this.zoom;
    const deltaY = (e.clientY - this.dragStart.y) / this.zoom;
    
    this.imagePosition.x += deltaX;
    this.imagePosition.y += deltaY;
    
    this.canvas.style.transform = `scale(${this.zoom}) translate(${this.imagePosition.x}px, ${this.imagePosition.y}px)`;
    
    this.dragStart = { x: e.clientX, y: e.clientY };
  }

  endDrag() {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  }

  handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.adjustZoom(delta);
  }

  downloadImage() {
    if (!this.originalImage) return;

    // Create a temporary canvas for download
    const downloadCanvas = document.createElement('canvas');
    const downloadCtx = downloadCanvas.getContext('2d');
    
    downloadCanvas.width = this.originalImage.width;
    downloadCanvas.height = this.originalImage.height;
    
    // Apply the same filters as the main canvas
    let filterString = '';
    
    if (this.filters.brightness !== 100) {
      filterString += `brightness(${this.filters.brightness}%) `;
    }
    if (this.filters.contrast !== 100) {
      filterString += `contrast(${this.filters.contrast}%) `;
    }
    if (this.filters.saturate !== 100) {
      filterString += `saturate(${this.filters.saturate}%) `;
    }
    if (this.filters.blur > 0) {
      filterString += `blur(${this.filters.blur}px) `;
    }
    if (this.filters['hue-rotate'] !== 0) {
      filterString += `hue-rotate(${this.filters['hue-rotate']}deg) `;
    }
    if (this.filters.grayscale > 0) {
      filterString += `grayscale(${this.filters.grayscale}%) `;
    }
    if (this.filters.sepia > 0) {
      filterString += `sepia(${this.filters.sepia}%) `;
    }
    if (this.filters.invert > 0) {
      filterString += `invert(${this.filters.invert}%) `;
    }

    downloadCtx.filter = filterString || 'none';
    downloadCtx.drawImage(this.originalImage, 0, 0);
    
    // Apply custom filters
    if (this.filters.temperature !== 0 || this.filters.tint !== 0 || this.filters.vibrance !== 100) {
      const imageData = downloadCtx.getImageData(0, 0, downloadCanvas.width, downloadCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Temperature adjustment
        if (this.filters.temperature !== 0) {
          const temp = this.filters.temperature / 100;
          if (temp > 0) {
            r = Math.min(255, r + temp * 30);
            g = Math.min(255, g + temp * 10);
          } else {
            b = Math.min(255, b - temp * 30);
            g = Math.min(255, g - temp * 10);
          }
        }

        // Tint adjustment
        if (this.filters.tint !== 0) {
          const tint = this.filters.tint / 100;
          if (tint > 0) {
            g = Math.min(255, g + tint * 20);
          } else {
            r = Math.min(255, r - tint * 20);
          }
        }

        // Vibrance adjustment
        if (this.filters.vibrance !== 100) {
          const vibrance = (this.filters.vibrance - 100) / 100;
          const max = Math.max(r, g, b);
          const avg = (r + g + b) / 3;
          const amt = (Math.abs(max - avg) * 2 / 255) * vibrance;
          
          if (r !== max) r += (max - r) * amt;
          if (g !== max) g += (max - g) * amt;
          if (b !== max) b += (max - b) * amt;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      downloadCtx.putImageData(imageData, 0, 0);
    }
    
    // Apply vignette
    if (this.filters.vignette > 0) {
      const centerX = downloadCanvas.width / 2;
      const centerY = downloadCanvas.height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      
      const gradient = downloadCtx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, maxRadius
      );
      
      const intensity = this.filters.vignette / 100;
      gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
      gradient.addColorStop(0.6, `rgba(0, 0, 0, ${intensity * 0.1})`);
      gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.8})`);
      
      downloadCtx.globalCompositeOperation = 'multiply';
      downloadCtx.fillStyle = gradient;
      downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
      downloadCtx.globalCompositeOperation = 'source-over';
    }
    
    // Download the image
    downloadCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filtered-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new ImageFilterApp();
});