(function () {
  "use strict";

  var NAME_MAX = 30;
  var QTY_MAX = 10;

  var form = document.getElementById("fwv-form");
  var nameInput = document.getElementById("fwv-name");
  var nameCount = document.getElementById("fwv-name-count");
  var phoneInput = document.getElementById("fwv-phone");
  var qtyInputs = Array.prototype.slice.call(document.querySelectorAll(".fwv-qty"));
  var liveTotal = document.getElementById("fwv-live-total");
  var formErr = document.getElementById("fwv-form-err");

  var billEmpty = document.getElementById("fwv-bill-empty");
  var billBody = document.getElementById("fwv-bill-body");
  var billMeta = document.getElementById("fwv-bill-meta");
  var billRows = document.getElementById("fwv-bill-rows");
  var billTotal = document.getElementById("fwv-bill-total");

  var logList = document.getElementById("fwv-log");
  var logStarted = false;
  var billNo = 1000;

  function logMsg(text) {
    if (!logStarted) { logList.innerHTML = ""; logStarted = true; }
    var li = document.createElement("li");
    li.textContent = text;
    logList.appendChild(li);
    while (logList.children.length > 7) logList.removeChild(logList.firstChild);
  }

  function money(n) { return "Rs. " + n.toLocaleString("en-IN"); }

  // Show or clear the message under a field and mark the field valid / invalid.
  function setState(input, message) {
    var errEl = document.getElementById(input.id + "-err");
    if (errEl) errEl.textContent = message;
    input.classList.remove("fwv-invalid", "fwv-valid");
    if (message) {
      void input.offsetWidth; // restart the shake animation
      input.classList.add("fwv-invalid");
    } else if (input.value.trim() !== "") {
      input.classList.add("fwv-valid");
    }
    return message === "";
  }

  /* ---------- Validation rules (if / else) ---------- */
  function checkName() {
    var v = nameInput.value.trim();
    var msg = "";
    if (v === "") msg = "Name is required.";
    else if (v.length < 2) msg = "Name needs at least 2 characters.";
    else if (v.length > NAME_MAX) msg = "Name can have at most " + NAME_MAX + " characters.";
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(v)) msg = "Use letters and spaces only.";
    return setState(nameInput, msg);
  }

  function checkPhone() {
    var v = phoneInput.value.trim();
    var msg = "";
    if (v === "") msg = "Mobile number is required.";
    else if (!/^\d+$/.test(v)) msg = "Digits only, please.";
    else if (v.length !== 10) msg = "Enter exactly 10 digits.";
    else if (!/^[6-9]/.test(v)) msg = "Number must start with 6, 7, 8 or 9.";
    return setState(phoneInput, msg);
  }

  function checkQty(input) {
    var raw = input.value.trim();
    var v = Number(raw);
    var msg = "";
    if (raw === "") msg = "Enter a quantity (0 if none).";
    else if (isNaN(v) || v % 1 !== 0) msg = "Use a whole number.";
    else if (v < 0) msg = "Quantity cannot be negative.";
    else if (v > QTY_MAX) msg = "Maximum " + QTY_MAX + " per item.";
    return setState(input, msg);
  }

  /* ---------- Running total ---------- */
  function calcTotal() {
    var sum = 0;
    qtyInputs.forEach(function (q) {
      var n = Number(q.value);
      if (!isNaN(n) && n > 0 && n <= QTY_MAX && n % 1 === 0) sum += n * Number(q.getAttribute("data-price"));
    });
    return sum;
  }
  function updateLiveTotal() { liveTotal.textContent = money(calcTotal()); }

  /* ---------- oninput: real-time feedback ---------- */
  nameInput.addEventListener("input", function () {
    var len = nameInput.value.length;
    nameCount.textContent = len + " / " + NAME_MAX;
    nameCount.classList.toggle("fwv-over", len > NAME_MAX);
    checkName();
    logMsg("oninput name -> length " + len + (len > NAME_MAX ? " (over limit)" : ""));
  });

  phoneInput.addEventListener("input", function () {
    // Strip anything that is not a digit as the user types (format pattern)
    var cleaned = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    if (cleaned !== phoneInput.value) phoneInput.value = cleaned;
    checkPhone();
    logMsg("oninput phone -> " + cleaned.length + " digit(s)");
  });

  qtyInputs.forEach(function (q) {
    q.addEventListener("input", function () {
      checkQty(q);
      updateLiveTotal();
      formErr.textContent = "";
      logMsg("oninput " + q.getAttribute("data-item") + " -> qty " + (q.value === "" ? "empty" : q.value));
    });
  });

  /* ---------- onsubmit: validate everything, then build the bill ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var okName = checkName();
    var okPhone = checkPhone();
    var qtyResults = qtyInputs.map(checkQty);
    var okQty = qtyResults.every(Boolean);

    formErr.textContent = "";
    var total = calcTotal();

    if (okName && okPhone && okQty && total === 0) {
      formErr.textContent = "Add at least one item to place an order.";
      logMsg("onsubmit -> blocked: no items selected");
      return;
    }
    if (!(okName && okPhone && okQty)) {
      formErr.textContent = "Please fix the highlighted fields.";
      logMsg("onsubmit -> blocked: " + (okName ? "" : "name ") + (okPhone ? "" : "phone ") + (okQty ? "" : "quantity") );
      return;
    }

    buildBill(total);
    logMsg("onsubmit -> all checks passed, bill generated");
  });

  function buildBill(total) {
    billRows.innerHTML = "";
    qtyInputs.forEach(function (q) {
      var n = Number(q.value);
      if (n > 0) {
        var price = Number(q.getAttribute("data-price"));
        var tr = document.createElement("tr");
        [q.getAttribute("data-item"), String(n), money(price), money(n * price)].forEach(function (txt) {
          var td = document.createElement("td");
          td.textContent = txt;
          tr.appendChild(td);
        });
        billRows.appendChild(tr);
      }
    });
    billNo += 1;
    var now = new Date();
    billMeta.textContent = "Bill #" + billNo + " | " + nameInput.value.trim() + " | " + phoneInput.value.trim() +
      " | " + now.toLocaleDateString("en-IN");
    billTotal.textContent = money(total);
    billEmpty.hidden = true;
    billBody.hidden = false;
    billBody.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- Reset ---------- */
  form.addEventListener("reset", function () {
    setTimeout(function () {
      [nameInput, phoneInput].concat(qtyInputs).forEach(function (i) {
        i.classList.remove("fwv-invalid", "fwv-valid");
        var errEl = document.getElementById(i.id + "-err");
        if (errEl) errEl.textContent = "";
      });
      nameCount.textContent = "0 / " + NAME_MAX;
      nameCount.classList.remove("fwv-over");
      formErr.textContent = "";
      billBody.hidden = true;
      billEmpty.hidden = false;
      updateLiveTotal();
      logMsg("reset -> form and bill cleared");
    }, 0);
  });

  updateLiveTotal();
})();
