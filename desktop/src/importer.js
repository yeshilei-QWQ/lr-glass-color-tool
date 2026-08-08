/* ================= 导入面板（图库）=================
 * 职责：
 *  1. 侧边栏「导入」面板 UI：专属拖放区 + 「选择文件」按钮 + 已导入缩略列表。
 *     （拖放只在此面板生效，预览区画布平移不再误触导入。）
 *  2. 实现 importQueue（批处理/工作流接口）。
 *
 * 当前仅启用「单张」处理（importMode = 'single'）：可连续导入多张进入队列，
 * 通过缩略列表点击切换「当前编辑图」；每张独立编辑。将来实现批处理逻辑后，
 * 调用 importQueue.setMode('batch') 切换为对全部图片应用处理。
 * ==================================================== */

(function () {
  var MAX = (typeof PREVIEW_MAX !== 'undefined') ? PREVIEW_MAX : 900;

  /* ---- 解码单张图片 -> 队列项（ImageData） ---- */
  function decodeFile(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { showToast('读取文件失败'); cb(null); };
    reader.onload = function (e) {
      var img = new Image();
      img.onerror = function () { showToast('无法解码图片'); cb(null); };
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX * 2 || h > MAX * 2) {
          var r = Math.min((MAX * 2) / w, (MAX * 2) / h);
          w = Math.floor(w * r); h = Math.floor(h * r);
        }
        var off = document.createElement('canvas');
        off.width = w; off.height = h;
        var ctx = off.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var data = ctx.getImageData(0, 0, w, h);

        var pw = img.naturalWidth, ph = img.naturalHeight;
        var scale = Math.min(1, MAX / Math.max(pw, ph));
        var pW = Math.max(1, Math.floor(pw * scale)), pH = Math.max(1, Math.floor(ph * scale));
        var off2 = document.createElement('canvas');
        off2.width = pW; off2.height = pH;
        off2.getContext('2d').drawImage(img, 0, 0, pW, pH);
        var preview = off2.getContext('2d').getImageData(0, 0, pW, pH);

        cb({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name: file.name,
          w: w, h: h,
          data: data,
          preview: preview,
          previewW: pW, previewH: pH,
          createdAt: Date.now()
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---- 激活某张为「当前编辑图」---- */
  function activateImage(idx) {
    if (!imageStack[idx]) return;
    activeImageIndex = idx;
    var it = imageStack[idx];
    imageWidth = it.w; imageHeight = it.h;
    sourceData = it.data;
    previewWidth = it.previewW; previewHeight = it.previewH;
    previewData = it.preview;
    setupCanvas();
    resetAll(false);
    renderImportList();
    render();
  }

  /* ---- 渲染缩略列表 ---- */
  function thumbHTML(it) {
    try {
      var temp = document.createElement('canvas');
      temp.width = it.previewW; temp.height = it.previewH;
      temp.getContext('2d').putImageData(it.preview, 0, 0);
      var mini = document.createElement('canvas');
      mini.width = 48; mini.height = 48;
      var mctx = mini.getContext('2d');
      mctx.fillStyle = '#15151a'; mctx.fillRect(0, 0, 48, 48);
      var s = Math.min(44 / it.w, 44 / it.h);
      var dw = Math.floor(it.w * s) || 1, dh = Math.floor(it.h * s) || 1;
      var ox = Math.floor((48 - dw) / 2), oy = Math.floor((48 - dh) / 2);
      mctx.drawImage(temp, ox, oy, dw, dh);
      return mini.toDataURL('image/png');
    } catch (e) { return ''; }
  }

  function renderImportList() {
    var list = document.getElementById('importList');
    var count = document.getElementById('importCount');
    var empty = document.getElementById('importListEmpty');
    if (!list) return;
    if (count) count.textContent = imageStack.length + ' 张';
    if (imageStack.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = imageStack.map(function (it, i) {
      var active = i === activeImageIndex ? ' active' : '';
      return '<li class="import-item' + active + '" data-idx="' + i + '" title="' + escapeHtml(it.name) + '">' +
        '<img class="import-thumb" src="' + thumbHTML(it) + '" alt="">' +
        '<div class="import-info"><span class="import-name">' + escapeHtml(it.name) + '</span>' +
        '<span class="import-meta">' + it.w + 'x' + it.h + (i === activeImageIndex ? ' · 编辑中' : '') + '</span></div>' +
        '<button class="import-del" data-idx="' + i + '" title="移除">×</button>' +
        '</li>';
    }).join('');
    list.querySelectorAll('.import-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.classList.contains('import-del')) return;
        activateImage(parseInt(el.dataset.idx, 10));
      });
    });
    list.querySelectorAll('.import-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeImage(parseInt(btn.dataset.idx, 10));
      });
    });
  }

  function removeImage(idx) {
    if (idx < 0 || idx >= imageStack.length) return;
    imageStack.splice(idx, 1);
    var wasActive = idx === activeImageIndex;
    if (wasActive && imageStack.length > 0) {
      activeImageIndex = Math.min(idx, imageStack.length - 1);
      activateImage(activeImageIndex);
    } else if (wasActive) {
      activeImageIndex = -1;
      sourceData = null; previewData = null;
      imageWidth = 0; imageHeight = 0;
      document.getElementById('canvasWrap').classList.add('hidden');
      document.getElementById('emptyState').classList.remove('hidden');
      renderImportList();
    } else {
      if (idx < activeImageIndex) activeImageIndex--;
      renderImportList();
    }
  }

  function addImages(files, done) {
    var arr = Array.prototype.slice.call(files || []);
    var imgs = arr.filter(function (f) { return f && f.type && f.type.indexOf('image/') === 0; });
    if (imgs.length === 0) { showToast('仅支持图片文件'); if (done) done([]); return; }

    var pending = imgs.length, added = [];
    imgs.forEach(function (f) {
      decodeFile(f, function (item) {
        pending--;
        if (item) { imageStack.push(item); added.push(item); }
        if (pending === 0) {
          if (imageStack.length > 0 && activeImageIndex < 0) {
            activateImage(0);
          } else if (added.length > 0) {
            activateImage(imageStack.length - 1);
          } else {
            renderImportList();
          }
          if (done) done(added);
        }
      });
    });
  }

  /* ---- 面板交互绑定 ---- */
  function initImporter() {
    var zone = document.getElementById('dropZone');
    var btn = document.getElementById('importPickBtn');
    var fileInput = document.getElementById('importFile');

    if (btn && fileInput) {
      btn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function (e) {
        addImages(e.target.files, function () { fileInput.value = ''; });
      });
    } else if (btn) {
      btn.addEventListener('click', function () {
        var top = document.getElementById('fileInput');
        if (top) top.click();
      });
    }

    if (zone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          zone.classList.add('over');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          zone.classList.remove('over');
        });
      });
      zone.addEventListener('drop', function (e) { addImages(e.dataTransfer.files); });
    }

    renderImportList();
  }

  window.__importInternals = { addImages: addImages, activateImage: activateImage, renderImportList: renderImportList };
  importQueue.addImages = addImages;
  importQueue.activate = activateImage;
  window.initImporter = initImporter;
})();