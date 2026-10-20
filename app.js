(function () {
  "use strict";
  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var fmt = function (value, digits) { return Number(value).toLocaleString("en-US", { maximumFractionDigits: digits === undefined ? 4 : digits, minimumFractionDigits: 0 }); };
  var esc = function (value) { return String(value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var toastTimer;
  function toast(message) {
    var node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.classList.remove("is-visible"); }, 2600);
  }

  // Session-only theme preference: no network or persistent storage is needed.
  $("#themeToggle").addEventListener("click", function () {
    var dark = document.body.classList.toggle("dark-mode");
    this.setAttribute("aria-pressed", String(dark));
    toast(dark ? "فُعّل المظهر الداكن." : "أُعيد المظهر الفاتح.");
  });

  var outcomes = $$(".outcome-check");
  function updateOutcomes() {
    var completed = outcomes.filter(function (item) { return item.checked; }).length;
    $("#outcomeProgress").style.width = (completed / outcomes.length * 100) + "%";
    $("#outcomeProgressText").textContent = completed + " من " + outcomes.length + " كفايات أُنجزت";
  }
  outcomes.forEach(function (item) { item.addEventListener("change", updateOutcomes); });

  $$(".mini-option").forEach(function (button) {
    button.addEventListener("click", function () {
      $$(".mini-option").forEach(function (other) { other.classList.remove("is-correct", "is-wrong"); });
      var good = button.dataset.mini === "double";
      button.classList.add(good ? "is-correct" : "is-wrong");
      $("#miniFeedback").textContent = good
        ? "صحيح. عند ثبات التركيز، تتناسب الكتلة طرديًا مع الحجم: m = cₘ × V."
        : "راجع العلاقة m = cₘ × V. عند ثبات التركيز، ماذا يحدث للكتلة إذا تضاعف الحجم؟";
    });
  });

  $$(".method-tab").forEach(function (button) {
    button.addEventListener("click", function () {
      var method = button.dataset.method;
      $$(".method-tab").forEach(function (tab) {
        var active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      $$(".method-panel").forEach(function (panel) {
        var active = panel.id === (method === "solid" ? "solidMethod" : "liquidMethod");
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    });
  });

  // Interactive calculator: solid reagent, accounting for stated purity.
  var solidMode = $("#solidMode");
  function updateSolidMode() { $("#molarMassField").hidden = solidMode.value !== "molar"; }
  solidMode.addEventListener("change", updateSolidMode);
  function calcError(target, message) {
    target.innerHTML = "<small>تعذّر الحساب</small><strong>—</strong><span>" + esc(message) + "</span>";
  }
  $("#solidCalc").addEventListener("submit", function (event) {
    event.preventDefault();
    var mode = solidMode.value;
    var concentration = Number($("#solidConcentration").value);
    var volume = Number($("#solidVolume").value) / 1000;
    var molarMass = Number($("#solidMolarMass").value);
    var purityPercent = Number($("#solidPurity").value);
    var result = $("#solidResult");
    if (!(concentration > 0 && volume > 0 && purityPercent > 0 && purityPercent <= 100) || (mode === "molar" && !(molarMass > 0))) {
      calcError(result, "أدخل قيمًا موجبة وتحقّق من أن النقاوة أكبر من 0% ولا تتجاوز 100%.");
      return;
    }
    var pureMass = mode === "molar" ? concentration * volume * molarMass : concentration * volume;
    var weighedMass = pureMass / (purityPercent / 100);
    var formula = mode === "molar" ? "m = C × V × M ÷ (النقاوة/100)" : "m = cₘ × V ÷ (النقاوة/100)";
    result.innerHTML = "<small>كتلة الوزن المطلوبة</small><strong>" + fmt(weighedMass, 6) + " g</strong><span>" + esc(formula) + " · الكتلة النظرية للمذاب النقي " + fmt(pureMass, 6) + " g.</span>";
  });

  // Liquid stock reagent: density plus mass fraction yields approximate concentration.
  $("#stockCalc").addEventListener("submit", function (event) {
    event.preventDefault();
    var density = Number($("#stockDensity").value);
    var percent = Number($("#stockPercent").value);
    var molarMass = Number($("#stockMolarMass").value);
    var result = $("#stockResult");
    if (!(density > 0 && percent > 0 && percent <= 100 && molarMass > 0)) {
      calcError(result, "تأكّد من القيم؛ النسبة الكتلية يجب أن تكون أكبر من 0% ولا تتجاوز 100%.");
      return;
    }
    var massConc = density * 1000 * percent / 100;
    var molarConc = massConc / molarMass;
    result.innerHTML = "<small>التركيز الكتلي التقريبي</small><strong>" + fmt(massConc, 6) + " g/L</strong><small>التركيز المولي التقريبي</small><strong>" + fmt(molarConc, 6) + " mol/L</strong><span>cₘ = ρ × 1000 × w؛ ثم C = cₘ ÷ M. راجع بيانات المورد ودرجة الحرارة.</span>";
  });

  // Dilution: enforce that the target is no more concentrated than the stock.
  $("#dilutionCalc").addEventListener("submit", function (event) {
    event.preventDefault();
    var c1 = Number($("#dilutionC1").value);
    var c2 = Number($("#dilutionC2").value);
    var v2 = Number($("#dilutionV2").value);
    var result = $("#dilutionResult");
    if (!(c1 > 0 && c2 > 0 && v2 > 0)) {
      calcError(result, "أدخل تراكيز وأحجامًا موجبة.");
      return;
    }
    if (c2 > c1) {
      calcError(result, "التركيز المستهدف أعلى من تركيز المحلول الأم؛ التخفيف وحده لا يمكنه تحقيق ذلك.");
      return;
    }
    var v1 = c2 * v2 / c1;
    result.innerHTML = "<small>حجم المحلول الأم V₁</small><strong>" + fmt(v1, 6) + " mL</strong><span>V₁ = C₂ × V₂ ÷ C₁. أكمل بالمذيب إلى الحجم النهائي " + fmt(v2, 6) + " mL.</span>";
  });

  // Exercise bank: conceptual recall, calculations, lab technique, and safety.
  var questions = [
    {id:1,cat:"concepts",type:"choice",q:"ماذا يعبّر عنه التركيز الكتلي cₘ؟",o:["عدد مولات المذاب في لتر","كتلة المذاب بالغرام في لتر من المحلول","كتلة المذيب في لتر","حجم المذاب في المحلول"],a:1,e:"التركيز الكتلي هو نسبة كتلة المذاب إلى الحجم النهائي للمحلول: cₘ = m/V، ووحدته الشائعة g/L."},
    {id:2,cat:"concepts",type:"choice",q:"ما الوحدة الشائعة للتركيز المولي؟",o:["g/L","g/mol","mol/L","mol/g"],a:2,e:"C = n/V، لذلك وحدته mol/L عندما يكون الحجم باللتر."},
    {id:3,cat:"calcul",type:"number",q:"نريد تحضير 250 mL بتركيز كتلي 5.0 g/L. ما كتلة المذاب اللازمة؟",u:"g",a:1.25,t:.005,h:"حوّل 250 mL إلى 0.250 L، ثم استعمل m = cₘ × V.",e:"m = 5.0 g/L × 0.250 L = 1.25 g."},
    {id:4,cat:"concepts",type:"choice",q:"أي علاقة تصلح لحساب التركيز المولي انطلاقًا من كتلة مذاب صلب؟",o:["C = m × M × V","C = m / (M × V)","C = M / (m × V)","C = V / m"],a:1,e:"بما أن n = m/M وC = n/V، فإن C = m/(M×V)، مع كتلة بالغرام وحجم باللتر."},
    {id:5,cat:"calcul",type:"number",q:"احسب كتلة NaCl اللازمة لتحضير 250 mL من محلول 0.100 mol/L. الكتلة المولية 58.44 g/mol.",u:"g",a:1.461,t:.008,h:"m = C × V(L) × M.",e:"m = 0.100 × 0.250 × 58.44 = 1.461 g تقريبًا."},
    {id:6,cat:"calcul",type:"number",q:"ما التركيز الكتلي لمحلول NaOH تركيزه المولي 0.20 mol/L؟ الكتلة المولية 40.0 g/mol.",u:"g/L",a:8,t:.05,h:"cₘ = C × M.",e:"cₘ = 0.20 mol/L × 40.0 g/mol = 8.0 g/L."},
    {id:7,cat:"calcul",type:"number",q:"حوّل 100 mL إلى لتر لاستخدامه في علاقة التركيز.",u:"L",a:.1,t:.0001,h:"اقسم الحجم بالمليلتر على 1000.",e:"100 ÷ 1000 = 0.100 L."},
    {id:8,cat:"calcul",type:"number",q:"كاشف سائل كثافته 1.18 g/mL ونسبته الكتلية 37%. احسب تركيزه الكتلي التقريبي.",u:"g/L",a:436.6,t:1.5,h:"cₘ = ρ × 1000 × w، حيث w = 0.37.",e:"cₘ = 1.18 × 1000 × 0.37 = 436.6 g/L. القيمة تعتمد على البيانات الفعلية للكاشف."},
    {id:9,cat:"calcul",type:"number",q:"باستخدام cₘ = 436.6 g/L وM(HCl) = 36.46 g/mol، احسب التركيز المولي التقريبي.",u:"mol/L",a:11.97,t:.08,h:"C = cₘ/M.",e:"C = 436.6 ÷ 36.46 ≈ 11.97 mol/L."},
    {id:10,cat:"concepts",type:"choice",q:"ما العلاقة التي تربط محلولًا أمًا بمحلول ناتج عن تخفيفه؟",o:["C₁ + V₁ = C₂ + V₂","C₁V₁ = C₂V₂","C₁/V₁ = C₂/V₂ دائمًا","C₁V₂ = C₂V₁"],a:1,e:"عند التخفيف تبقى كمية مادة المذاب المأخوذة ثابتة؛ لذا C₁V₁ = C₂V₂."},
    {id:11,cat:"calcul",type:"number",q:"ما حجم محلول أم تركيزه 1.00 mol/L اللازم لتحضير 250 mL بتركيز 0.100 mol/L؟",u:"mL",a:25,t:.1,h:"V₁ = C₂V₂/C₁.",e:"V₁ = (0.100 × 250 mL) ÷ 1.00 = 25.0 mL."},
    {id:12,cat:"procedure",type:"choice",q:"ما الوظيفة الأساسية للدورق الحجمي أثناء التحضير؟",o:["قياس كتلة المذاب","تسخين المحلول إلى الغليان","ضبط الحجم النهائي المحدّد بدقة مناسبة","قياس درجة الحموضة"],a:2,e:"الدورق الحجمي مُعاير لضبط حجم نهائي محدد عند درجة الحرارة المرجعية للأداة."},
    {id:13,cat:"procedure",type:"choice",q:"لماذا نشطف الكأس والقمع ونضيف مياه الشطف إلى الدورق الحجمي؟",o:["لتغيير الكتلة المولية","لضمان النقل الكمي للمذاب","لزيادة التركيز","لمنع الحاجة إلى المزج"],a:1,e:"الشطف ينقل بقايا المذاب العالقة على الأدوات إلى الدورق، فيقل فقد المادة وتتحسن دقة التركيز."},
    {id:14,cat:"safety",type:"choice",q:"عند تخفيف حمض مركز وفق الإجراء المعتمد، ما القاعدة العامة؟",o:["إضافة الماء بسرعة إلى الحمض","إضافة الحمض إلى الماء بحذر","مزج الحمض بأي مذيب دون مراجعة","إغلاق العبوة قبل ارتداء الوقاية"],a:1,e:"التخفيف قد يطلق حرارة؛ القاعدة العامة إضافة الحمض إلى الماء ببطء وحذر، مع معدات الوقاية والتهوية والإجراء المحلي المناسب."},
    {id:15,cat:"calcul",type:"choice",q:"إذا تضاعف الحجم النهائي مع ثبات التركيز نفسه، فماذا يحدث لكتلة المذاب المطلوبة؟",o:["تتضاعف","تنخفض إلى النصف","لا تتغير","تصبح صفرًا"],a:0,e:"بما أن m = cₘV أو m = CMV، فالكتلة تتناسب طرديًا مع الحجم عندما يبقى التركيز ثابتًا."},
    {id:16,cat:"calcul",type:"number",q:"حوّل 250 mg/L إلى g/L.",u:"g/L",a:.25,t:.005,h:"كل 1000 mg تساوي 1 g.",e:"250 mg/L = 0.250 g/L."},
    {id:17,cat:"procedure",type:"choice",q:"لماذا نقرأ أسفل التقعّر (meniscus) عند مستوى العين في المحاليل المناسبة لذلك؟",o:["لتغيير كثافة المحلول","لتقليل خطأ اختلاف المنظر","لتقليل الحجم النهائي","لزيادة ذوبانية المذاب"],a:1,e:"النظر إلى العلامة من مستوى العين يقلل خطأ اختلاف المنظر؛ وتُتبع تعليمات قراءة الأداة والسائل المستخدم."},
    {id:18,cat:"calcul",type:"number",q:"حوّل كثافة 1.18 g/mL إلى g/L.",u:"g/L",a:1180,t:1,h:"اضرب في 1000 لأن اللتر يحتوي 1000 mL.",e:"1.18 g/mL × 1000 mL/L = 1180 g/L."},
    {id:19,cat:"calcul",type:"number",q:"ما كمية المادة في 5.844 g من NaCl إذا كانت M = 58.44 g/mol؟",u:"mol",a:.1,t:.001,h:"n = m/M.",e:"n = 5.844 ÷ 58.44 = 0.100 mol."},
    {id:20,cat:"concepts",type:"choice",q:"كيف نحوّل التركيز الكتلي إلى تركيز مولي إذا عُرفت الكتلة المولية؟",o:["C = cₘ × M","C = cₘ / M","C = M / cₘ","C = cₘ + M"],a:1,e:"C = cₘ/M؛ فوحدات g/L ÷ g/mol تعطي mol/L."},
    {id:21,cat:"calcul",type:"number",q:"احسب كمية المادة في 2.00 g من مادة كتلتها المولية 40.0 g/mol.",u:"mol",a:.05,t:.0005,h:"n = m/M.",e:"n = 2.00 ÷ 40.0 = 0.0500 mol."},
    {id:22,cat:"calcul",type:"number",q:"ما حجم محلول أم تركيزه 2.00 mol/L المطلوب لتحضير 200 mL بتركيز 0.250 mol/L؟",u:"mL",a:25,t:.1,h:"V₁ = C₂V₂/C₁.",e:"V₁ = (0.250 × 200) ÷ 2.00 = 25.0 mL."},
    {id:23,cat:"calcul",type:"number",q:"ما كتلة المذاب اللازمة لتحضير 0.500 L بتركيز كتلي 10.0 g/L؟",u:"g",a:5,t:.05,h:"m = cₘ × V.",e:"m = 10.0 × 0.500 = 5.00 g."},
    {id:24,cat:"procedure",type:"choice",q:"أي ممارسة صحيحة عند تحضير محلول من مادة صلبة؟",o:["نزن المادة مباشرة على كفة الميزان","ننقل المذاب دون شطف أدوات النقل","نذيب أولًا في حجم أقل ثم نكمل إلى العلامة","نضيف حجم الماء النهائي كاملًا قبل إدخال المذاب"],a:2,e:"الإجراء المعتاد: إذابة المذاب في حجم أقل من النهائي، ثم النقل الكمي والإكمال إلى علامة الدورق الحجمي."},
    {id:25,cat:"calcul",type:"number",q:"كاشف كثافته 1.10 g/mL ونسبته الكتلية 20% وكتلته المولية 40.0 g/mol. احسب تركيزه المولي التقريبي.",u:"mol/L",a:5.5,t:.05,h:"أولًا cₘ = 1.10 × 1000 × 0.20؛ ثم اقسم على 40.0.",e:"cₘ = 220 g/L، ومنه C = 220 ÷ 40.0 = 5.50 mol/L."},
    {id:26,cat:"calcul",type:"number",q:"ما كمية المادة في 100 mL من محلول تركيزه 0.200 mol/L؟",u:"mol",a:.02,t:.0003,h:"n = C × V، ويجب أن يكون V باللتر.",e:"n = 0.200 × 0.100 = 0.0200 mol."},
    {id:27,cat:"concepts",type:"choice",q:"ما فائدة الكثافة والنسبة الكتلية المدرجتين على كاشف سائل تجاري؟",o:["تحديد لون المحلول فقط","تقدير تركيز الكاشف عند معرفة الكتلة المولية","معرفة الحجم النهائي للدورق","إلغاء الحاجة إلى مراجعة النقاوة"],a:1,e:"الكثافة تعطي كتلة حجم معلوم من المحلول، والنسبة الكتلية تعطي حصة المذاب من تلك الكتلة؛ ومنهما يمكن تقدير التركيز."},
    {id:28,cat:"safety",type:"choice",q:"أي معلومات ينبغي أن تظهر على بطاقة محلول مُحضّر وفق نظام المخبر؟",o:["اسم المحلول والتركيز والوحدة وتاريخ التحضير ومعلومات السلامة اللازمة","اسم المحضّر فقط","لون الغطاء فقط","قيمة الحجم من دون اسم المادة"],a:0,e:"بطاقة التعريف تتيح تحديد المحتوى والتركيز والتاريخ والمخاطر ذات الصلة؛ وتُضاف هوية المحضّر أو بيانات أخرى وفق نظام الجودة المحلي."}
  ];

  var categoryNames = {concepts:"مفاهيم",calcul:"حسابات",procedure:"إجراءات",safety:"سلامة"};
  var state = {};
  questions.forEach(function (q) { state[q.id] = {selected:null,value:"",status:"new",attempts:0,awarded:false,revealed:false,feedback:""}; });
  var filter = "all";
  var page = 0;
  var pageSize = 8;
  var visibleQuestions = function () { return questions.filter(function (q) { return filter === "all" || q.cat === filter; }); };

  function renderQuestion(q, number) {
    var s = state[q.id];
    var css = "exercise-card" + (s.status === "correct" ? " is-correct" : s.status === "wrong" ? " is-wrong" : "");
    var html = '<article class="' + css + '" data-question="' + q.id + '">';
    html += '<div class="exercise-head"><span class="exercise-number">تمرين ' + String(number).padStart(2,"0") + ' / ' + String(q.id).padStart(2,"0") + '</span><span class="exercise-category">' + categoryNames[q.cat] + '</span></div>';
    html += '<p class="exercise-prompt">' + esc(q.q) + '</p>';
    if (q.type === "choice") {
      html += '<div class="exercise-options" role="group" aria-label="خيارات التمرين ' + q.id + '">';
      q.o.forEach(function (option, index) {
        var chosen = s.selected === index;
        var answerCss = (s.status === "correct" && index === q.a) ? " is-answer" : "";
        var wrongCss = (s.status === "wrong" && chosen && index !== q.a) ? " is-selected-wrong" : "";
        html += '<label class="exercise-option' + answerCss + wrongCss + '"><input type="radio" name="question-' + q.id + '" value="' + index + '"' + (chosen ? " checked" : "") + '><span>' + esc(option) + '</span></label>';
      });
      html += '</div>';
    } else {
      html += '<div class="numeric-answer"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="الإجابة الرقمية للتمرين ' + q.id + '" data-numeric="' + q.id + '" placeholder="اكتب القيمة الرقمية" value="' + esc(s.value) + '"><span class="answer-unit">' + esc(q.u || "") + '</span></div>';
    }
    html += '<div class="exercise-actions"><button class="check-answer" type="button" data-check="' + q.id + '">' + (s.status === "correct" ? "إجابة صحيحة ✓" : "تحقّق من إجابتي") + '</button><button class="secondary-action" type="button" data-hint="' + q.id + '">تلميح</button><button class="secondary-action" type="button" data-reveal="' + q.id + '">عرض التصحيح المفسّر</button></div>';
    html += '<div class="exercise-feedback ' + (s.status === "correct" ? "feedback-correct" : s.status === "wrong" ? "feedback-wrong" : "") + '" id="feedback-' + q.id + '" aria-live="polite">' + s.feedback + '</div></article>';
    return html;
  }

  function updateScore() {
    var score = questions.filter(function (q) { return state[q.id].awarded; }).length;
    var tried = questions.filter(function (q) { return state[q.id].attempts > 0 || state[q.id].revealed; }).length;
    $("#scoreValue").innerHTML = score + ' <small>/ ' + questions.length + '</small>';
    $("#scorePercent").textContent = Math.round(score / questions.length * 100) + "%";
    $("#scoreRing").style.background = "conic-gradient(#168b75 " + (score / questions.length * 100) + "%, #d6e8df 0)";
    $("#quizProgress").style.width = (tried / questions.length * 100) + "%";
    $("#answeredText").textContent = tried === 0 ? "لم تُجب عن أي تمرين بعد" : tried + " من " + questions.length + " تمارين تمت محاولتها";
    $("#accuracyText").textContent = score + " إجابة صحيحة مُحتسبة؛ كشف الحل لا يمنح نقطة";
    var badges = $$(".achievement");
    badges[0].classList.toggle("is-locked", score < 5);
    badges[0].textContent = (score >= 5 ? "✓ " : "◇ ") + "متدرّب";
    badges[1].classList.toggle("is-locked", score < 14);
    badges[1].textContent = (score >= 14 ? "✓ " : "◇ ") + "محضّر";
    badges[2].classList.toggle("is-locked", score < questions.length);
    badges[2].textContent = (score === questions.length ? "✓ " : "◇ ") + "مدقّق";
    $("#quizFinish").hidden = tried < questions.length;
    if (tried === questions.length) {
      $("#finishMessage").textContent = score === questions.length
        ? "إتقان كامل في رصيد التمارين. راجع خطوات السلامة قبل تطبيق أي إجراء عملي."
        : "حصلت على " + score + " من " + questions.length + ". راجع التمارين غير المتقنة، ثم أعد المحاولة الكاملة لتثبيت المفاهيم.";
    }
  }

  function renderExercises() {
    var list = visibleQuestions();
    var pageCount = Math.max(1, Math.ceil(list.length / pageSize));
    page = Math.max(0, Math.min(page, pageCount - 1));
    var start = page * pageSize;
    $("#exerciseGrid").innerHTML = list.slice(start, start + pageSize).map(function (q, index) {
      return renderQuestion(q, start + index + 1);
    }).join("");
    $("#pageInfo").textContent = "الصفحة " + (page + 1) + " من " + pageCount + " · " + list.length + " تمارين";
    $("#prevPage").disabled = page === 0;
    $("#nextPage").disabled = page >= pageCount - 1;
    $$(".filter-button").forEach(function (button) { button.classList.toggle("is-active", button.dataset.filter === filter); });
    updateScore();
  }

  function setFeedback(id, kind, title, message, extraHtml) {
    var s = state[id];
    var card = $('[data-question="' + id + '"]');
    if (!card) return;
    var html = "<strong>" + esc(title) + "</strong><p>" + esc(message) + "</p>";
    if (extraHtml) html += '<p class="answer-reveal">' + extraHtml + "</p>";
    s.feedback = html;
    var feedback = $("#feedback-" + id);
    feedback.className = "exercise-feedback" + (kind === "correct" ? " feedback-correct" : kind === "wrong" ? " feedback-wrong" : "");
    feedback.innerHTML = html;
    card.classList.toggle("is-correct", kind === "correct");
    card.classList.toggle("is-wrong", kind === "wrong");
    if (kind === "correct") {
      var q = questions.find(function (item) { return item.id === id; });
      $$(".exercise-option", card).forEach(function (label, index) { label.classList.toggle("is-answer", index === q.a); });
      var check = $('[data-check="' + id + '"]', card);
      if (check) check.textContent = "إجابة صحيحة ✓";
    }
  }

  function checkAnswer(id) {
    var q = questions.find(function (item) { return item.id === id; });
    var s = state[id];
    var answer;
    if (q.type === "choice") {
      if (s.selected === null) {
        setFeedback(id, "wrong", "اختر إجابة أولًا.", "حدّد أحد الخيارات، ثم اطلب التحقق من إجابتك.");
        return;
      }
      answer = s.selected;
    } else {
      var raw = String(s.value).trim().replace(",", ".");
      if (!raw || !Number.isFinite(Number(raw))) {
        setFeedback(id, "wrong", "أدخل قيمة رقمية.", "اكتب رقمًا صالحًا؛ ويمكنك استخدام النقطة أو الفاصلة العشرية.");
        return;
      }
      answer = Number(raw);
    }
    s.attempts += 1;
    var correct = q.type === "choice" ? answer === q.a : Math.abs(answer - q.a) <= q.t;
    if (correct) {
      s.status = "correct";
      if (!s.awarded && !s.revealed) s.awarded = true;
      setFeedback(id, "correct", s.revealed ? "وصلت إلى الإجابة الصحيحة بعد مراجعة التصحيح." : "إجابة صحيحة. أحسنت.", q.e,
        s.revealed ? "بعد كشف الحل، لن تُحتسب هذه الإجابة ضمن رصيد الإتقان الحالي. أعد المحاولة الكاملة للتقييم المستقل." : "");
    } else {
      s.status = "wrong";
      var retry = q.type === "number"
        ? "راجع الوحدة والحساب خطوة بخطوة ثم أعد المحاولة. لا تُحتسب نقطة إلا عند الوصول إلى النتيجة دون كشف الحل."
        : "حاول مرة أخرى. اقرأ السؤال وحدّد المفهوم الذي يختبره قبل اختيار الإجابة.";
      setFeedback(id, "wrong", "ليست الإجابة الصحيحة بعد.", retry);
    }
    updateScore();
  }

  $("#exerciseGrid").addEventListener("change", function (event) {
    var target = event.target;
    if (target.matches('input[type="radio"]')) state[Number(target.name.replace("question-", ""))].selected = Number(target.value);
    if (target.matches("[data-numeric]")) state[Number(target.dataset.numeric)].value = target.value;
  });
  $("#exerciseGrid").addEventListener("input", function (event) {
    if (event.target.matches("[data-numeric]")) state[Number(event.target.dataset.numeric)].value = event.target.value;
  });
  $("#exerciseGrid").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    var id;
    if (button.hasAttribute("data-check")) { checkAnswer(Number(button.dataset.check)); return; }
    if (button.hasAttribute("data-hint")) {
      id = Number(button.dataset.hint);
      var hintQuestion = questions.find(function (q) { return q.id === id; });
      setFeedback(id, "hint", "تلميح دون كشف الإجابة.", hintQuestion.h || "استبعد الخيارات التي لا تطابق التعريف أو الغرض العملي الوارد في الدرس.");
      return;
    }
    if (button.hasAttribute("data-reveal")) {
      id = Number(button.dataset.reveal);
      var q = questions.find(function (item) { return item.id === id; });
      var s = state[id];
      s.revealed = true;
      s.status = "new";
      var answerText = q.type === "choice" ? q.o[q.a] : fmt(q.a, 6) + " " + q.u;
      setFeedback(id, "hint", "التصحيح المفسّر.", q.e, "الإجابة الصحيحة: <strong>" + esc(answerText) + "</strong>. عرض الحل لا يمنح نقطة؛ أعد المحاولة الكاملة إذا أردت قياس الإتقان دون مساعدة.");
      updateScore();
    }
  });

  $$(".filter-button").forEach(function (button) {
    button.addEventListener("click", function () { filter = button.dataset.filter; page = 0; renderExercises(); });
  });
  $("#prevPage").addEventListener("click", function () { page -= 1; renderExercises(); });
  $("#nextPage").addEventListener("click", function () { page += 1; renderExercises(); });
  $("#resetQuiz").addEventListener("click", function () {
    questions.forEach(function (q) { state[q.id] = {selected:null,value:"",status:"new",attempts:0,awarded:false,revealed:false,feedback:""}; });
    filter = "all";
    page = 0;
    renderExercises();
    toast("أُعيدت جميع التمارين إلى حالتها الأولى.");
  });

  // Calculate example values immediately so the visible output matches the default inputs.
  updateSolidMode();
  $("#solidCalc").dispatchEvent(new Event("submit", {bubbles:true,cancelable:true}));
  $("#stockCalc").dispatchEvent(new Event("submit", {bubbles:true,cancelable:true}));
  $("#dilutionCalc").dispatchEvent(new Event("submit", {bubbles:true,cancelable:true}));
  renderExercises();
})();