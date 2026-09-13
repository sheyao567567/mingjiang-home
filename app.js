/* ============================================================
   铭匠全屋定制工厂 · 交互逻辑
   纯原生 JS，无依赖；表单提交处预留后端接口位置（见 submitLead）
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString("zh-CN"); };

  /* ---------------- 导航 ---------------- */
  var nav = $("#nav");
  var burger = $("#navBurger");
  var navLinks = $("#navLinks");

  window.addEventListener("scroll", function () {
    nav.classList.toggle("scrolled", window.scrollY > 30);
  }, { passive: true });

  burger.addEventListener("click", function () {
    burger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  $$("a", navLinks).forEach(function (a) {
    a.addEventListener("click", function () {
      burger.classList.remove("open");
      navLinks.classList.remove("open");
    });
  });

  /* ---------------- 滚动进场 ---------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------------- 数字滚动 ---------------- */
  var counted = false;
  var statIO = new IntersectionObserver(function (entries) {
    if (counted || !entries[0].isIntersecting) return;
    counted = true;
    $$(".count").forEach(function (el) {
      var to = +el.dataset.to, t0 = null, dur = 1400;
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    statIO.disconnect();
  }, { threshold: 0.3 });
  var statRow = $(".stat-row");
  if (statRow) statIO.observe(statRow);

  /* ---------------- 报价：通用小部件 ---------------- */
  function bindChips(groupId, onChange) {
    var group = $(groupId);
    $$(".chip", group).forEach(function (chip) {
      chip.addEventListener("click", function () {
        $$(".chip", group).forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        onChange(+chip.dataset.price, chip);
      });
    });
  }
  function chipPrice(groupId) {
    return +$(groupId + " .chip.active").dataset.price;
  }

  /* ---------------- 柜体报价 ---------------- */
  var cabArea = $("#cabArea"), cabAreaRange = $("#cabAreaRange");
  var cabOpt = { drawer: 0, glass: 0, stretcher: 0 };
  var CAB_PRICE = { drawer: 150, glass: 260, stretcher: 60 };
  var CAB_NAME = { drawer: "抽屉", glass: "玻璃门", stretcher: "拉直器" };
  var CAB_UNIT = { drawer: "个", glass: "扇", stretcher: "根" };

  function boardName() {
    return $("#cabBoard .chip.active").childNodes[0].textContent.trim();
  }

  function calcCabinet() {
    var area = Math.max(0, parseFloat(cabArea.value) || 0);
    var unit = chipPrice("#cabBoard");
    var base = area * unit;
    var lines = [{ k: "柜体 · " + boardName() + " · " + area + "㎡ × ¥" + fmt(unit), v: base }];
    var extra = 0;
    Object.keys(cabOpt).forEach(function (key) {
      if (cabOpt[key] > 0) {
        var cost = cabOpt[key] * CAB_PRICE[key];
        extra += cost;
        lines.push({ k: CAB_NAME[key] + " × " + cabOpt[key] + CAB_UNIT[key], v: cost });
      }
    });
    var total = base + extra;
    renderLines("#cabLines", lines, total);
    $("#cabTotal").textContent = fmt(total);
  }

  // 五金选配对：勾选 ↔ 数量
  $$("#panelCabinet .qopt").forEach(function (opt) {
    var key = opt.dataset.key;
    var check = $("input[type=checkbox]", opt);
    var cntEl = $("b", $(".qstep", opt));
    var minus = $('.step-btn[data-step="-1"]', opt);
    var plus = $('.step-btn[data-step="1"]', opt);

    function sync() {
      cntEl.textContent = cabOpt[key];
      minus.disabled = cabOpt[key] <= 0;
      check.checked = cabOpt[key] > 0;
      opt.classList.toggle("on", cabOpt[key] > 0);
      calcCabinet();
    }
    check.addEventListener("change", function () {
      cabOpt[key] = check.checked ? Math.max(1, cabOpt[key]) : 0;
      sync();
    });
    minus.addEventListener("click", function () { cabOpt[key] = Math.max(0, cabOpt[key] - 1); sync(); });
    plus.addEventListener("click", function () { cabOpt[key] = cabOpt[key] + 1; sync(); });
  });

  bindChips("#cabBoard", calcCabinet);
  cabArea.addEventListener("input", function () { cabAreaRange.value = cabArea.value || 0; calcCabinet(); });
  cabAreaRange.addEventListener("input", function () { cabArea.value = cabAreaRange.value; calcCabinet(); });

  /* ---------------- 门窗报价 ---------------- */
  var winArea = $("#winArea"), winAreaRange = $("#winAreaRange"), winSash = $("#winSash");
  var sashCount = 2;

  function glassName() {
    return $("#winGlass .chip.active").childNodes[0].textContent.trim();
  }
  function profileName() {
    return $("#winProfile .chip.active").childNodes[0].textContent.trim();
  }

  function calcWindow() {
    var raw = Math.max(0, parseFloat(winArea.value) || 0);
    var area = raw > 0 ? Math.max(5, raw) : 0; // 不足 5㎡ 按 5㎡ 起算
    var profile = chipPrice("#winProfile");
    var glass = chipPrice("#winGlass");
    var unit = profile + glass;
    var base = area * unit;
    var sashCost = sashCount * 480;
    var total = base + sashCost;

    var lines = [
      { k: "窗体 · " + profileName() + " · " + area + "㎡ × ¥" + fmt(unit), v: base },
      { k: "玻璃 · " + glassName(), v: glass * area, labelOnly: glass === 0 },
      { k: "开扇 · " + sashCount + " 扇 × ¥480", v: sashCost }
    ];
    renderLines("#winLines", lines, total);
    $("#winTotal").textContent = fmt(total);
    winSash.textContent = sashCount;
    $("#winSashMinus").disabled = sashCount <= 0;
  }

  bindChips("#winProfile", calcWindow);
  bindChips("#winGlass", calcWindow);
  winArea.addEventListener("input", function () { winAreaRange.value = winArea.value || 0; calcWindow(); });
  winAreaRange.addEventListener("input", function () { winArea.value = winAreaRange.value; calcWindow(); });
  $("#winSashMinus").addEventListener("click", function () { sashCount = Math.max(0, sashCount - 1); calcWindow(); });
  $("#winSashPlus").addEventListener("click", function () { sashCount += 1; calcWindow(); });

  function renderLines(sel, lines, total) {
    var ul = $(sel);
    ul.innerHTML = "";
    lines.forEach(function (l) {
      var li = document.createElement("li");
      var k = document.createElement("span");
      k.textContent = l.k;
      var v = document.createElement("b");
      v.textContent = l.labelOnly ? "标配" : "¥ " + fmt(l.v);
      li.appendChild(k); li.appendChild(v);
      ul.appendChild(li);
    });
    var li = document.createElement("li");
    var k = document.createElement("span");
    k.textContent = "合计";
    var v = document.createElement("b");
    v.textContent = "¥ " + fmt(total);
    v.style.color = "var(--gold)";
    li.appendChild(k); li.appendChild(v);
    ul.appendChild(li);
  }

  /* ---------------- 报价 Tab 切换 ---------------- */
  function switchTab(name) {
    $$(".quote-tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    $("#panelCabinet").classList.toggle("active", name === "cabinet");
    $("#panelWindow").classList.toggle("active", name === "window");
  }
  $$(".quote-tab").forEach(function (t) {
    t.addEventListener("click", function () { switchTab(t.dataset.tab); });
  });
  $$("[data-quote-tab]").forEach(function (a) {
    a.addEventListener("click", function () { switchTab(a.dataset.quoteTab); });
  });

  /* ---------------- 案例筛选 ---------------- */
  $("#caseTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".case-tab");
    if (!btn) return;
    $$(".case-tab").forEach(function (t) { t.classList.toggle("active", t === btn); });
    var cat = btn.dataset.cat;
    $$(".case-card").forEach(function (card) {
      var show = cat === "all" || card.dataset.cat === cat;
      card.classList.toggle("hide", !show);
      if (show) { card.classList.remove("in"); requestAnimationFrame(function () { card.classList.add("in"); }); }
    });
  });

  /* ---------------- 预约弹窗 ---------------- */
  var modal = $("#bookingModal");
  var modalQuoteText = $("#modalQuoteText");
  var lastQuoteSummary = "";

  function currentSummary(kind) {
    if (kind === "window") {
      return "门窗报价 · " + (parseFloat(winArea.value) || 0) + "㎡ · " + profileName() +
        " · " + glassName() + " · 开扇 " + sashCount + " · 预估 ¥" + $("#winTotal").textContent;
    }
    return "柜体报价 · " + (parseFloat(cabArea.value) || 0) + "㎡ · " + boardName() +
      " · 预估 ¥" + $("#cabTotal").textContent;
  }

  function openModal(kind) {
    lastQuoteSummary = kind ? currentSummary(kind) : "";
    if (lastQuoteSummary) {
      modalQuoteText.textContent = lastQuoteSummary;
      modalQuoteText.classList.add("show");
    } else {
      modalQuoteText.classList.remove("show");
    }
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  $$("[data-open-booking]").forEach(function (b) {
    b.addEventListener("click", function () { openModal(b.dataset.quote || null); });
  });
  $$("[data-close-booking]").forEach(function (b) { b.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /* ---------------- 表单提交 ---------------- */
  function validPhone(v) { return /^1[3-9]\d{9}$/.test(v); }

  /**
   * 提交线索。当前为纯静态站：写入 localStorage 并弹出成功提示。
   * 接入后端时，将下方 fetch 取消注释并替换为您的接口地址即可。
   */
  function submitLead(data) {
    try {
      var leads = JSON.parse(localStorage.getItem("mj_leads") || "[]");
      leads.push(data);
      localStorage.setItem("mj_leads", JSON.stringify(leads));
    } catch (e) { /* 隐私模式下静默降级 */ }

    // fetch("https://your-api.example.com/leads", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data)
    // });
  }

  function bindLeadForm(form, after) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var community = form.community.value.trim();
      var ok = true;

      [form.name, form.phone, form.community].forEach(function (i) { i.classList.remove("err"); });
      if (!name) { form.name.classList.add("err"); ok = false; }
      if (!validPhone(phone)) { form.phone.classList.add("err"); ok = false; }
      if (!community) { form.community.classList.add("err"); ok = false; }
      if (!ok) return;

      submitLead({
        name: name,
        phone: phone,
        community: community,
        desc: form.desc.value.trim(),
        quote: lastQuoteSummary || null,
        source: form.id === "bookingForm" ? "报价弹窗" : "预约咨询板块",
        time: new Date().toISOString()
      });

      form.reset();
      if (after) after();
      showToast();
    });
  }

  bindLeadForm($("#bookingForm"), closeModal);
  bindLeadForm($("#contactForm"), null);

  /* ---------------- Toast ---------------- */
  var toast = $("#toast"), toastTimer = null;
  function showToast() {
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }
  toast.addEventListener("click", function () { toast.classList.remove("show"); });

  /* ---------------- 微信号复制 ---------------- */
  var wxBtn = $("#wxCopy"), wxTip = $("#wxTip");
  var wxTipText = wxTip.textContent;
  wxBtn.addEventListener("click", function () {
    var text = wxBtn.textContent.trim();
    function done() {
      wxTip.textContent = "已复制，去微信粘贴添加";
      setTimeout(function () { wxTip.textContent = wxTipText; }, 2200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
  });

  /* ---------------- 工艺透视：聚光灯蒙版 ----------------
     移植自用户提供的 React 实现：鼠标平滑追踪 (ease 0.1) +
     网格视差 (ease 0.06, ±16px) + 径向渐变蒙版 (R=260)。
     改进：CSS mask 替代逐帧 canvas.toDataURL（GPU 友好），
     增加触屏支持与闲置自动巡游。 */
  (function craftSpotlight() {
    var stages = $$(".craft-stage");
    if (!stages.length) return;

    stages.forEach(function (stage) {
    var reveal = stage.querySelector(".craft-detail");
    var grid = stage.querySelector(".craft-grid");
    if (!reveal || !grid) return;

    var SPOT_R = 260, GRID_RANGE = 16;
    if (window.innerWidth < 640) SPOT_R = 190;
    reveal.style.setProperty("--r", SPOT_R + "px");

    var mouse = null;          // 目标位置（相对 stage）
    var smooth = null;         // 平滑位置
    var gridOff = { x: 0, y: 0 };
    var lastInteract = 0;      // 最近交互时间
    var running = false, rafId = null;
    var t0 = performance.now();

    function stageRect() { return stage.getBoundingClientRect(); }

    function onMove(clientX, clientY) {
      var r = stageRect();
      mouse = { x: clientX - r.left, y: clientY - r.top };
      if (!smooth) smooth = { x: mouse.x, y: mouse.y };
      lastInteract = performance.now();
    }

    stage.addEventListener("pointermove", function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    stage.addEventListener("pointerdown", function (e) { onMove(e.clientX, e.clientY); }, { passive: true });

    function frame(now) {
      var r = stageRect();
      var idle = now - lastInteract > 3500;

      // 闲置 3.5s 后自动巡游（利萨如轨迹），让手机用户也能看到效果
      if (idle || !mouse) {
        var t = (now - t0) / 1000;
        mouse = {
          x: r.width * 0.5 + Math.sin(t * 0.5) * r.width * 0.3,
          y: r.height * 0.5 + Math.sin(t * 0.33) * r.height * 0.24
        };
      }
      if (!smooth) smooth = { x: mouse.x, y: mouse.y };

      smooth.x += (mouse.x - smooth.x) * 0.1;
      smooth.y += (mouse.y - smooth.y) * 0.1;

      reveal.style.setProperty("--mx", smooth.x + "px");
      reveal.style.setProperty("--my", smooth.y + "px");

      // 网格视差
      var cx = smooth.x / r.width - 0.5, cy = smooth.y / r.height - 0.5;
      gridOff.x += (cx * GRID_RANGE - gridOff.x) * 0.06;
      gridOff.y += (cy * GRID_RANGE - gridOff.y) * 0.06;
      grid.style.setProperty("--gx", gridOff.x + "px");
      grid.style.setProperty("--gy", gridOff.y + "px");

      if (running) rafId = requestAnimationFrame(frame);
    }

    // 仅在可视区域内运行动画循环
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !running) {
        running = true;
        rafId = requestAnimationFrame(frame);
      } else if (!entries[0].isIntersecting && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    }, { threshold: 0.05 }).observe(stage);

    // 首次进入时给出提示性初始位置
    lastInteract = 0;
    });
  })();

  /* ---------------- 初始化 ---------------- */
  calcCabinet();
  calcWindow();
})();
