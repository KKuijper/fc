/* ══════════════════════════════════════════════════════════════════════════
   Freestyle Concepts — page behaviour.

   Ported from the design canvas logic (Freestyle Concepts.dc.html) to plain
   DOM code. Content that repeats lives in index.html; this file only reads,
   toggles and computes. Pricing sits on the <option> elements as data-*
   attributes so the price list has one home, in the markup.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Business settings — these were the design canvas's editable props. */
  var SITE = {
    whatsappNumber: '27655935067',
    showPrices: true,
    googleReviewsUrl: 'https://share.google/u00i4BVBYUqZVC0i5',
    facebookUrl: 'https://www.facebook.com/fc.concepts.9/'
  };

  var BULK_AT = 20;          // items from which bulk pricing and 7-day turnaround apply
  var GALLERY_PAGE = 8;      // photos shown before "See all"
  var SIZES = ['Kids', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  var CLOTHING = ['tshirt', 'polo', 'hoodie', 'cap', 'baby', 'own'];

  /* Mock-up shapes: `d` is the garment outline, `detail` the seam lines,
     `box` the printable area as [left, top, width, height] in % of the
     200×220 viewBox. */
  var PRODUCTS = {
    tshirt: {
      label: 'T-shirt', colourLabel: 'Shirt colour',
      d: 'M 60 18 L 28 38 L 6 78 L 42 98 L 44 202 L 156 202 L 158 98 L 194 78 L 172 38 L 140 18 C 132 40 68 40 60 18 Z',
      detail: 'M 60 18 C 68 40 132 40 140 18 C 128 30 72 30 60 18 Z',
      box: [26, 36, 48, 42]
    },
    polo: {
      label: 'Polo shirt', colourLabel: 'Shirt colour',
      d: 'M 76 20 L 28 40 L 6 80 L 42 100 L 44 202 L 156 202 L 158 100 L 194 80 L 172 40 L 124 20 C 118 34 82 34 76 20 Z',
      detail: 'M 76 20 L 88 40 L 100 30 L 112 40 L 124 20 M 88 40 L 92 82 M 112 40 L 108 82 M 92 82 L 108 82',
      box: [27, 46, 46, 36]
    },
    hoodie: {
      label: 'Hoodie / sweater', colourLabel: 'Hoodie colour',
      d: 'M 62 26 L 26 44 L 8 170 L 44 178 L 44 204 L 156 204 L 156 178 L 192 170 L 174 44 L 138 26 C 130 48 70 48 62 26 Z',
      detail: 'M 62 26 C 66 10 134 10 138 26 C 130 48 70 48 62 26 M 44 178 L 44 104 M 156 178 L 156 104 M 92 46 L 92 100 M 108 46 L 108 100 M 8 170 L 44 178 M 192 170 L 156 178',
      box: [30, 48, 40, 34]
    },
    cap: {
      label: 'Cap', colourLabel: 'Cap colour',
      d: 'M 100 58 C 140 58 168 92 168 132 L 168 140 L 32 140 L 32 132 C 32 92 60 58 100 58 Z M 168 140 C 190 141 196 148 196 154 C 196 161 188 164 172 164 L 140 164 C 152 158 158 150 160 140 Z',
      detail: 'M 32 132 L 168 132 M 100 58 C 82 76 74 102 73 132 M 100 58 C 118 76 126 102 127 132',
      box: [42, 44, 30, 20]
    },
    bag: {
      label: 'Tote bag', colourLabel: 'Bag colour',
      d: 'M 44 62 L 156 62 L 156 200 L 44 200 Z M 72 62 C 72 34 128 34 128 62',
      detail: 'M 44 74 L 156 74',
      box: [32, 44, 40, 34]
    },
    mug: {
      label: 'Mug', colourLabel: 'Mug colour',
      d: 'M 50 66 L 148 66 L 148 178 C 148 188 140 194 130 194 L 68 194 C 58 194 50 188 50 178 Z M 148 92 C 178 92 186 104 186 122 C 186 140 178 152 148 152',
      detail: 'M 50 78 L 148 78',
      box: [32, 44, 40, 32]
    }
  };

  var state = {
    filter: 'all',
    galleryOpen: false,
    occasion: 'birthday',
    useSizes: false,
    sizes: {},
    product: 'tshirt',
    colour: 'white',
    textPos: 'below',
    text: '',
    logoUrl: null,
    logoImg: null
  };

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setPressed(buttons, isOn) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', isOn(b) ? 'true' : 'false'); });
  }

  var waNumber = SITE.whatsappNumber.replace(/\D/g, '');

  function waHref(text) {
    return 'https://wa.me/' + waNumber + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* South African rand, space-grouped: R1 800 */
  function rand(n) {
    return 'R' + n.toLocaleString('en-ZA').replace(/,/g, ' ');
  }

  /* The date N working days from today, Saturdays and Sundays skipped. */
  function readyBy(workingDays) {
    var d = new Date();
    var left = workingDays;
    while (left > 0) {
      d.setDate(d.getDate() + 1);
      var day = d.getDay();
      if (day !== 0 && day !== 6) left--;
    }
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /* ── Outbound links ───────────────────────────────────────────────────── */

  $$('[data-wa-link]').forEach(function (a) { a.href = waHref(); });
  $$('[data-fb-link]').forEach(function (a) { a.href = SITE.facebookUrl; });
  var reviewsLink = $('[data-reviews-link]');
  if (reviewsLink) reviewsLink.href = SITE.googleReviewsUrl;

  /* ── Mobile navigation ────────────────────────────────────────────────── */

  var navToggle = $('[data-nav-toggle]');
  var navPanel = $('#nav-panel');
  var navIconOpen = $('[data-nav-icon="open"]');
  var navIconClose = $('[data-nav-icon="close"]');

  function setNav(open) {
    navPanel.hidden = !open;
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navIconOpen.hidden = open;
    navIconClose.hidden = !open;
  }

  navToggle.addEventListener('click', function () { setNav(navPanel.hidden); });
  $$('a', navPanel).forEach(function (a) {
    a.addEventListener('click', function () { setNav(false); });
  });

  /* ── Gallery: category filter + show all ──────────────────────────────── */

  var figures = $$('[data-gallery] > figure');
  var filterBtns = $$('[data-filters] button');
  var galleryToggle = $('[data-gallery-toggle]');
  var galleryCount = $('[data-gallery-count]');

  function renderGallery() {
    var matching = figures.filter(function (f) {
      return state.filter === 'all' || f.dataset.cat === state.filter;
    });
    var shown = state.galleryOpen ? matching : matching.slice(0, GALLERY_PAGE);
    figures.forEach(function (f) { f.hidden = shown.indexOf(f) === -1; });

    setPressed(filterBtns, function (b) { return b.dataset.filter === state.filter; });
    galleryCount.textContent = 'Showing ' + shown.length + ' of ' + matching.length + ' prints';
    galleryToggle.hidden = matching.length <= GALLERY_PAGE;
    galleryToggle.textContent = state.galleryOpen
      ? 'Show fewer photos'
      : 'See all ' + matching.length + ' photos';
    markAll();
  }

  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.filter = b.dataset.filter;
      state.galleryOpen = false;
      renderGallery();
    });
  });
  galleryToggle.addEventListener('click', function () {
    state.galleryOpen = !state.galleryOpen;
    renderGallery();
  });

  /* ── Occasion finder ──────────────────────────────────────────────────── */

  var occasionBtns = $$('[data-occasions] button');
  var suggestions = $$('[data-suggestions] > .suggestion');

  function renderOccasions() {
    setPressed(occasionBtns, function (b) { return b.dataset.occasion === state.occasion; });
    suggestions.forEach(function (s) { s.hidden = s.dataset.for !== state.occasion; });
  }

  occasionBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.occasion = b.dataset.occasion;
      renderOccasions();
    });
  });

  /* ── Instant estimate ─────────────────────────────────────────────────── */

  var itemSelect = $('[data-item]');
  var qtyInput = $('[data-qty]');
  var simpleBlock = $('[data-simple-mode]');
  var sizeBlock = $('[data-size-mode]');
  var sizeInputs = $$('[data-size]');
  var sizeToggle = $('[data-size-toggle]');
  var sizeTotal = $('[data-size-total]');
  var bulkTip = $('[data-bulk-tip]');
  var priceRows = $$('[data-price-row]');
  var perItemEl = $('[data-per-item]');
  var totalEl = $('[data-total]');
  var readyEl = $('[data-ready-by]');
  var turnNoteEl = $('[data-turn-note]');
  var quoteCta = $('[data-quote-cta]');
  var printOptions = $('[data-print-options]');
  var printSize = $('[data-print-size]');
  var printColours = $('[data-print-colours]');

  /* Stephen's print prices, by size and number of colours. A logo-size print
     is not offered in full colour. */
  var PRINTS = {
    logo: { '1': 35, '2': 45 },
    a5:   { '1': 45, '2': 55, c: 65 },
    a4:   { '1': 70, '2': 80, c: 95 }
  };
  var SIZE_ORDER = ['logo', 'a5', 'a4'];
  /* Wording for the WhatsApp message. Scraping the option labels produced
     "a a4 print"; these read the way a person would say it. */
  var PRINT_WORDS = {
    logo: 'a logo-size print', a5: 'an A5 print', a4: 'an A4 print',
    '1': 'one colour', '2': 'two colours', c: 'full colour'
  };

  /* Baby wear and caps are printed at their own flat rate, the same whatever
     the print size, written on the option as data-prints="1:30,2:40,c:50". */
  function flatPrints(o) {
    if (!o.dataset.prints) return null;
    var table = {};
    o.dataset.prints.split(',').forEach(function (pair) {
      var bits = pair.split(':');
      table[bits[0].trim()] = Number(bits[1]);
    });
    return table;
  }

  function currentItem() {
    var o = itemSelect.selectedOptions[0] || itemSelect.options[0];
    var garment = o.dataset.garment;
    return {
      id: o.value,
      label: o.textContent.trim(),
      garment: garment === undefined ? null : Number(garment),
      maxPrint: o.dataset.maxPrint || 'a4',
      prints: flatPrints(o),
      lo: Number(o.dataset.lo), hi: Number(o.dataset.hi)
    };
  }

  /* Only offer print sizes the item can physically take, and only offer full
     colour where it exists. Clamp the selection if the current one drops away. */
  function syncPrintOptions(item) {
    var cap = SIZE_ORDER.indexOf(item.maxPrint);
    $$('option', printSize).forEach(function (o) {
      o.hidden = SIZE_ORDER.indexOf(o.value) > cap;
    });
    if (SIZE_ORDER.indexOf(printSize.value) > cap) printSize.value = item.maxPrint;
    var table = item.prints || PRINTS[printSize.value];
    $$('option', printColours).forEach(function (o) {
      o.hidden = !(o.value in table);
    });
    if (!(printColours.value in table)) printColours.value = '1';
    return table[printColours.value];
  }

  /* Bulk is a flat 5 percent from BULK_AT items, not a separate price band. */
  function bulkPrice(amount) { return Math.round(amount * 0.95); }

  /* A mug has one price rather than a range, so do not print "R120 to R120". */
  function priceText(lo, hi) {
    return lo === hi ? rand(lo) : rand(lo) + '\u2013' + rand(hi);
  }

  function sizeCount(name) {
    return parseInt(state.sizes[name], 10) || 0;
  }

  function currentQty() {
    if (state.useSizes) {
      var sum = SIZES.reduce(function (t, s) { return t + sizeCount(s); }, 0);
      return Math.max(1, sum);
    }
    return Math.max(1, Math.min(2000, parseInt(qtyInput.value, 10) || 1));
  }

  function renderQuote() {
    var item = currentItem();
    var qty = currentQty();
    var bulk = qty >= BULK_AT;

    /* A garment is priced exactly: the blank plus the print they chose. */
    var byPrint = item.garment !== null;
    printOptions.hidden = !byPrint;
    var lo, hi, printLabel = '';
    if (byPrint) {
      var print = syncPrintOptions(item);
      lo = hi = item.garment + print;
      printLabel = ' with ' + PRINT_WORDS[printSize.value] + ' in ' + PRINT_WORDS[printColours.value];
    } else {
      lo = item.lo;
      hi = item.hi;
    }
    if (bulk) { lo = bulkPrice(lo); hi = bulkPrice(hi); }

    simpleBlock.hidden = state.useSizes;
    sizeBlock.hidden = !state.useSizes;
    sizeToggle.textContent = state.useSizes
      ? 'Back to a simple quantity'
      : 'Enter a size breakdown instead';
    sizeTotal.textContent = qty;

    priceRows.forEach(function (r) { r.hidden = !SITE.showPrices; });
    perItemEl.textContent = priceText(lo, hi);
    totalEl.textContent = priceText(lo * qty, hi * qty);
    readyEl.textContent = readyBy(bulk ? 7 : 3);
    turnNoteEl.textContent = bulk
      ? 'Bulk orders are ready within 7 working days.'
      : 'Small orders are ready in 3 working days.';
    bulkTip.hidden = !(CLOTHING.indexOf(item.id) !== -1 && qty > 4 && qty < BULK_AT && !state.useSizes);

    var priceBit = SITE.showPrices ? ' (site estimate ' + priceText(lo, hi) + ' each)' : '';
    var filled = SIZES.filter(function (s) { return sizeCount(s) > 0; })
      .map(function (s) { return s + '×' + sizeCount(s); });
    var sizeBit = state.useSizes && filled.length ? ' Sizes: ' + filled.join(', ') + '.' : '';
    quoteCta.href = waHref(
      "Hi Freestyle Concepts! I'd like a quote for " + qty + ' × ' + item.label + printLabel +
      priceBit + '.' + sizeBit + ' When could this be ready?'
    );
  }

  itemSelect.addEventListener('change', renderQuote);
  printSize.addEventListener('change', renderQuote);
  printColours.addEventListener('change', renderQuote);
  ['input', 'change'].forEach(function (ev) { qtyInput.addEventListener(ev, renderQuote); });
  sizeInputs.forEach(function (input) {
    ['input', 'change'].forEach(function (ev) {
      input.addEventListener(ev, function () {
        state.sizes[input.dataset.size] = input.value;
        renderQuote();
      });
    });
  });
  sizeToggle.addEventListener('click', function () {
    state.useSizes = !state.useSizes;
    renderQuote();
  });

  /* Presets from the occasion finder and the bulk section. */
  function applyPreset(itemId, qty, useSizes) {
    if (itemId) itemSelect.value = itemId;
    if (qty != null) qtyInput.value = qty;
    state.useSizes = !!useSizes;
    renderQuote();
  }

  $$('[data-preset-item]').forEach(function (a) {
    a.addEventListener('click', function () {
      applyPreset(a.dataset.presetItem, a.dataset.presetQty, false);
    });
  });
  var bulkPreset = $('[data-bulk-preset]');
  if (bulkPreset) {
    bulkPreset.addEventListener('click', function () { applyPreset('tshirt', null, true); });
  }

  /* ── Design it live ───────────────────────────────────────────────────── */

  var productBtns = $$('[data-products] button');
  var swatchBtns = $$('[data-swatches] button');
  var posBtns = $$('[data-text-pos] button');
  var textInput = $('[data-text]');
  var logoInput = $('[data-logo]');
  var clearLogoBtn = $('[data-clear-logo]');
  var previewSvg = $('[data-preview-svg]');
  var shapePath = $('[data-shape]');
  var detailPath = $('[data-detail]');
  var printBox = $('[data-print-box]');
  var printTextAbove = $('[data-print-text-above]');
  var printTextBelow = $('[data-print-text-below]');
  var printLogo = $('[data-print-logo]');
  var printEmpty = $('[data-print-empty]');
  var colourLabelEl = $('[data-colour-label]');
  var colourNameEl = $('[data-colour-name]');
  var productWordEl = $('[data-product-word]');
  var designCta = $('[data-design-cta]');
  var downloadBtn = $('[data-download]');

  function currentProduct() {
    return PRODUCTS[state.product] || PRODUCTS.tshirt;
  }

  function currentColour() {
    var b = swatchBtns.filter(function (s) { return s.dataset.colour === state.colour; })[0] || swatchBtns[0];
    return {
      id: b.dataset.colour,
      name: b.dataset.name,
      hex: b.dataset.hex,
      dark: b.dataset.dark === '1'
    };
  }

  function releaseLogo() {
    if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
    state.logoUrl = null;
    state.logoImg = null;
  }

  function renderDesigner() {
    var prod = currentProduct();
    var colour = currentColour();
    var text = state.text.trim();
    var hasText = text.length > 0;
    var hasLogo = !!state.logoUrl;
    var ink = colour.dark ? '#ffffff' : '#0d3049';

    setPressed(productBtns, function (b) { return b.dataset.product === state.product; });
    setPressed(swatchBtns, function (b) { return b.dataset.colour === state.colour; });
    setPressed(posBtns, function (b) { return b.dataset.pos === state.textPos; });
    posBtns.forEach(function (b) {
      $('[data-mark]', b).textContent = b.dataset.pos === state.textPos ? '✓' : '';
    });

    shapePath.setAttribute('d', prod.d);
    shapePath.setAttribute('fill', colour.hex);
    detailPath.setAttribute('d', prod.detail);
    previewSvg.setAttribute('aria-label', prod.label + ' preview');

    printBox.style.left = prod.box[0] + '%';
    printBox.style.top = prod.box[1] + '%';
    printBox.style.width = prod.box[2] + '%';
    printBox.style.height = prod.box[3] + '%';

    colourLabelEl.textContent = prod.colourLabel;
    colourNameEl.textContent = colour.name;
    productWordEl.textContent = prod.label.toLowerCase();

    printTextAbove.textContent = text;
    printTextBelow.textContent = text;
    printTextAbove.style.color = ink;
    printTextBelow.style.color = ink;
    printTextAbove.hidden = !(hasText && state.textPos === 'above');
    printTextBelow.hidden = !(hasText && state.textPos !== 'above');

    if (hasLogo) printLogo.src = state.logoUrl;
    else printLogo.removeAttribute('src');
    printLogo.hidden = !hasLogo;
    clearLogoBtn.hidden = !hasLogo;

    printEmpty.hidden = hasText || hasLogo;
    printEmpty.style.color = colour.dark ? 'rgba(255,255,255,0.75)' : 'rgba(13,48,73,0.55)';

    var bits = [];
    if (hasText) bits.push('the text "' + text + '"');
    if (hasLogo) bits.push("my own logo (I'll send the file here)");
    designCta.href = waHref(
      'Hi Freestyle Concepts! I designed a ' + colour.name.toLowerCase() + ' ' +
      prod.label.toLowerCase() + ' on your website' +
      (bits.length ? ' with ' + bits.join(' and ') : '') + '. Can I get a quote?'
    );
  }

  productBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.product = b.dataset.product; renderDesigner(); });
  });
  swatchBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.colour = b.dataset.colour; renderDesigner(); });
  });
  posBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.textPos = b.dataset.pos; renderDesigner(); });
  });
  ['input', 'change'].forEach(function (ev) {
    textInput.addEventListener(ev, function () { state.text = textInput.value; renderDesigner(); });
  });

  logoInput.addEventListener('change', function () {
    var file = logoInput.files && logoInput.files[0];
    if (!file) return;
    releaseLogo();
    state.logoUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { state.logoImg = img; renderDesigner(); };
    img.src = state.logoUrl;
    renderDesigner();
  });

  clearLogoBtn.addEventListener('click', function () {
    releaseLogo();
    logoInput.value = '';
    renderDesigner();
  });

  window.addEventListener('pagehide', releaseLogo);

  /* Redraw the mock-up on a canvas at 3× and hand it over as a PNG, so the
     customer can attach it to their WhatsApp message. */
  downloadBtn.addEventListener('click', function () {
    var prod = currentProduct();
    var colour = currentColour();
    var text = state.text.trim();
    var pos = state.textPos;

    var S = 3, W = 200 * S, H = 220 * S;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.scale(S, S);
    var shape = new Path2D(prod.d);
    ctx.fillStyle = colour.hex;
    ctx.fill(shape);
    ctx.strokeStyle = '#0d3049';
    ctx.lineWidth = 2;
    ctx.stroke(shape);
    ctx.restore();

    var ink = colour.dark ? '#ffffff' : '#0d3049';
    var boxX = prod.box[0] / 100 * W;
    var boxY = prod.box[1] / 100 * H;
    var boxW = prod.box[2] / 100 * W;
    var boxH = prod.box[3] / 100 * H;

    var img = state.logoImg;
    var hasImg = !!img;
    var lines = text
      ? text.match(/.{1,18}(\s|$)|\S+/g).map(function (s) { return s.trim(); }).filter(Boolean)
      : [];
    var lineH = 16 * S * 1.2;
    var textH = lines.length * lineH;
    var gap = hasImg && lines.length ? 8 * S : 0;

    var imgW = 0, imgH = 0;
    if (hasImg) {
      var maxH = boxH * 0.7 - (pos === 'above' ? textH : 0);
      var ratio = Math.min(boxW / img.width, maxH / img.height);
      imgW = img.width * ratio;
      imgH = img.height * ratio;
    }

    var y = boxY + (boxH - (imgH + gap + textH)) / 2;

    function drawText() {
      ctx.fillStyle = ink;
      ctx.font = '800 ' + (16 * S) + 'px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach(function (line, i) { ctx.fillText(line, boxX + boxW / 2, y + i * lineH); });
      y += textH;
    }

    if (pos === 'above' && lines.length) { drawText(); y += gap; }
    if (hasImg) { ctx.drawImage(img, boxX + (boxW - imgW) / 2, y, imgW, imgH); y += imgH + gap; }
    if (pos !== 'above' && lines.length) drawText();

    var link = document.createElement('a');
    link.download = 'freestyle-concepts-mockup.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  /* ── Scroll affordance for the sideways-scrolling rows ────────────────── */

  var scrollers = $$('[data-scrollable]');

  function markOverflow(el) {
    var max = el.scrollWidth - el.clientWidth;
    if (max <= 1) { el.removeAttribute('data-overflow'); return; }
    // The gallery carries inline padding that scroll snapping rests against,
    // so "at the start" is that offset, not zero.
    var rest = parseFloat(getComputedStyle(el).paddingInlineStart) || 0;
    var atStart = el.scrollLeft <= rest + 2;
    var atEnd = el.scrollLeft >= max - 2;
    el.setAttribute('data-overflow', atStart ? 'end' : atEnd ? 'start' : 'both');
  }

  function markAll() { scrollers.forEach(markOverflow); }

  scrollers.forEach(function (el) {
    el.addEventListener('scroll', function () { markOverflow(el); }, { passive: true });
  });
  window.addEventListener('resize', markAll);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(markAll);
    scrollers.forEach(function (el) { ro.observe(el); });
  }

  /* ── First paint ──────────────────────────────────────────────────────── */

  bulkTip.textContent = 'Tip: from ' + BULK_AT + ' items you get bulk prices.';
  renderGallery();
  renderOccasions();
  renderQuote();
  renderDesigner();
  markAll();
}());
