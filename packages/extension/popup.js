chrome.cookies.get({ url: server_url, name: "user" }, (cookie) => {
  // if (cookie) {
  //   if (!(cookie.value == "" || cookie.value === "null")) {
      var userDetails = parseQuery(cookie.value);
      let userName = userDetails['"name'].split("+").join(" ");
      document.getElementById("popup-user-name").innerHTML = `Hi ${userName},`;

      document.getElementById("popup-title-logout").classList.remove("hide");
      document.getElementById("nav-title").classList.remove("title-full-width");
      document.getElementById("popup-body-anonymous-user").style.display =
        "none";
  //   } else {
  //     document.getElementById("popup-body-auth-user").style.display = "none";
  //   }
  // } else {
  //   document.getElementById("popup-body-auth-user").style.display = "none";
  // }
});

function parseQuery(queryString) {
  var query = {};
  var pairs = (
    queryString[0] === "?" ? queryString.substr(1) : queryString
  ).split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
}

// Screenity video recording

// Start recording
$(document).ready(function () {
  $('[data-toggle="tooltip"]').tooltip();
  var recording = false;
  // Get default settings (set by the user)
  chrome.storage.sync.get(null, function (result) {
    if (!result.toolbar) {
      $("#persistent").prop("checked", true);
    }
    if (result.flip) {
      $("#flip").prop("checked", true);
    }
    if (result.pushtotalk) {
      $("#push").prop("checked", true);
    }
    if (result.countdown) {
      $("#countdown").prop("checked", true);
    }
    if (result.quality == "max") {
      $("#quality").html(chrome.i18n.getMessage("smaller_file_size"));
    } else {
      $("#quality").html(chrome.i18n.getMessage("highest_quality"));
    }
    if (result.type == "tab-only") {
      set_recording_type("tab-only");
    } else if (result.type == "desktop") {
      set_recording_type("desktop");
    }

    if ($(".type-active").attr("id") == "tab-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/tab-only.svg")
        );
    } else if ($(".type-active").attr("id") == "desktop") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/desktop.svg")
        );
    } else if ($(".type-active").attr("id") == "camera-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/camera-only.svg")
        );
    }
    $(".type-active").removeClass("type-active");
    $("#" + result.type).addClass("type-active");
    if ($("#" + result.type).attr("id") == "tab-only") {
      $("#" + result.type)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/tab-only-active.svg")
        );
    } else if ($("#" + result.type).attr("id") == "desktop") {
      $("#" + result.type)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/desktop-active.svg")
        );
    } else if ($("#" + result.type).attr("id") == "camera-only") {
      $("#" + result.type)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL(
            "./assets/images/popup/camera-only-active.svg"
          )
        );
    }
  });

  function record() {
    if (!recording) {
      chrome.runtime.sendMessage({ type: "record" });
      // chrome.tabs.getSelected(null, function (tab) {
      //   chrome.storage.sync.set({
      //     recordTabId: tab.id,
      //     recordWindowId: tab.windowId,
      //   });
      // });
      $("#record-text").html(chrome.i18n.getMessage("starting_recording"));
      document.getElementById("record").classList.add("btn-on-record");
    } else {
      recording = false;
      $("#record-text").html(chrome.i18n.getMessage("start_recording"));
      document.getElementById("record").classList.remove("btn-on-record");
      $(".record-options").show();
      chrome.runtime.sendMessage({ type: "stop-save" });
    }
  }

  function set_recording_type(type) {
    if (type == "tab-only") {
      document.getElementById("current-tab").checked = true;
    } else if (type == "desktop") {
      document.getElementById("entire-screen").checked = true;
    }
  }

  // Request extension audio access if website denies it (for background)
  function audioRequest() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        var audiodevices = [];
        navigator.mediaDevices.enumerateDevices().then(function (devices) {
          devices.forEach(function (device) {
            if (device.kind == "audioinput") {
              audiodevices.push({ label: device.label, id: device.deviceId });
            }
          });
          getAudio(audiodevices);
        });
      })
      .catch(function (error) {
        $("#mic-select").html(
          "<option value='disabled'>" +
            chrome.i18n.getMessage("disabled_allow_access") +
            "</option>"
        );
      });
  }

  function reset_cam_icon() {
    if ($("#camera-select").val() == "disabled") {
      document.getElementById("camera").checked = false;
      document.getElementById("camera-select").disabled = true;
      $("#cam-toggle-icon").removeClass("text-danger").addClass("text-muted");
    } else {
      document.getElementById("camera").checked = true;
      $("#cam-toggle-icon").removeClass("text-muted").addClass("text-danger");
    }
  }

  function reset_mic_icon() {
    if ($("#mic-select").val() == "disabled") {
      document.getElementById("mic").checked = false;
      document.getElementById("mic-select").disabled = true;
    } else {
      document.getElementById("mic").checked = true;
    }
  }

  // Get available audio devices
  function getAudio(audio) {
    $("#mic-select").html(
      "<option value='disabled'>" +
        chrome.i18n.getMessage("mic_disabled", "Mic Disabled") +
        "</option>"
    );
    audio.forEach(function (device) {
      if (device.label == "Disabled") {
        $("#mic-select").append(
          "<option value='" +
            device.id +
            "'>" +
            chrome.i18n.getMessage("mic_disabled", "Mic Disabled") +
            "</option>"
        );
      } else {
        $("#mic-select").append(
          "<option value='" + device.label + "'>" + device.label + "</option>"
        );
      }
    });
    chrome.storage.sync.get(["mic"], function (result) {
      if (result.mic != 0) {
        $("#mic-select").val(result.mic);
      } else {
        $("#mic-select").val($("#mic-select option:nth-child(2)").val());
        chrome.runtime.sendMessage({
          type: "update-mic",
          id: $("#mic-select").val(),
        });
      }
      reset_mic_icon();
    });
  }

  /* Get available camera devices and split the id and label. 
    then we are providing label as value because id get changed 
    on each tab */
  function getCamera(camera) {
    $("#camera-select").html(
      "<option value='disabled'>" +
        chrome.i18n.getMessage("cam_disabled", "Camera Disabled") +
        "</option>"
    );
    camera.forEach(function (device) {
      if (device.label == "Disabled") {
        $("#camera-select").append(
          "<option value='" +
            device.id +
            "'>" +
            chrome.i18n.getMessage("cam_disabled", "Camera Disabled") +
            "</option>"
        );
      } else {
        $("#camera-select").append(
          "<option value='" + device.label + "'>" + device.label + "</option>"
        );
      }
    });
    chrome.storage.sync.get(["camera"], function (result) {
      if (result.camera != 0 && result.camera != "disabled-access") {
        $("#camera-select").val(result.camera);
        if (
          $(".type-active").attr("id") == "camera-only" &&
          $("#camera-select").val() == "disabled"
        ) {
          $("#record").attr("disabled", true);
        } else {
          $("#record").removeAttr("disabled");
        }
      } else {
        $("#camera-select").val($("#camera-select option:nth-child(2)").val());
        chrome.runtime.sendMessage({
          type: "update-camera",
          id: $("#camera-select").val(),
        });
      }
      reset_cam_icon();
    });
  }

  // Get available camera devices
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: "camera-request",
    });
  });

  // Check if recording is ongoing
  chrome.runtime.sendMessage({ type: "record-request" }, function (response) {
    recording = response.recording;
    if (response.recording) {
      //changing the record button text and changing the background to red
      $("#record-text").html(chrome.i18n.getMessage("stop_recording"));
      document.getElementById("record").classList.add("btn-on-record");

      //changing the focus to record tab
      document.getElementById("record-tab-button").click();
      $("#record").removeAttr("disabled");

      //getting the ongoing record tab details from storage
      // chrome.storage.sync.get(
      //   ["recordTabId", "recordWindowId"],
      //   function (recordTab) {
      //     //changing the focus to record started tab
      //     chrome.tabs.update(recordTab.recordTabId, {
      //       active: true,
      //       selected: true,
      //       highlighted: true,
      //     });

      //     //changing the focus to record started window
      //     chrome.windows.getCurrent(null, function (window) {
      //       if (window.id !== recordTab.recordWindowId) {
      //         chrome.windows.update(recordTab.recordWindowId, {
      //           focused: true,
      //         });
      //       }
      //     });
      //   }
      // );
    }
  });

  // Check if current tab is unable to be recorded
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (
      tabs[0].url.includes("chrome://") ||
      tabs[0].url.includes("chrome-extension://") ||
      tabs[0].url.includes("chrome.com") ||
      tabs[0].url.includes("chrome.google.com")
    ) {
      $("#record").attr("disabled", true);
      $("#record-text").html(chrome.i18n.getMessage("cannot_record"));
      $(".record-options").hide();
    }
  });

  // Modify settings
  $("#flip").on("change", function () {
    chrome.storage.sync.set({ flip: this.checked });
    chrome.runtime.sendMessage({ type: "flip-camera", enabled: this.checked });
  });
  $("#push").on("change", function () {
    chrome.storage.sync.set({ pushtotalk: this.checked });
    chrome.runtime.sendMessage({ type: "push-to-talk", enabled: this.checked });
  });
  $("#countdown").on("change", function () {
    chrome.storage.sync.set({ countdown: this.checked });
  });
  $("#persistent").on("change", function () {
    chrome.storage.sync.set({ toolbar: !this.checked });
    chrome.runtime.sendMessage({
      type: "switch-toolbar",
      enabled: !this.checked,
    });
  });
  $("#camera-select").on("change", function () {
    chrome.runtime.sendMessage({
      type: "update-camera",
      id: $("#camera-select").val(),
    });
    if (
      $(".type-active").attr("id") == "camera-only" &&
      ($("#camera-select").val() == "disabled" ||
        $("#camera-select").val() == "disabled-access")
    ) {
      $("#record").attr("disabled", true);
    } else {
      $("#record").removeAttr("disabled");
    }
    reset_cam_icon();
  });
  $("#camera").on("click", function () {
    let isCameraSelcted = document.getElementById("camera").checked;
    if (isCameraSelcted) {
      document.getElementById("camera-select").disabled = false;
      $("#camera-select").val($("#camera-select option:nth-child(2)").val());
      chrome.runtime.sendMessage({
        type: "update-camera",
        id: $("#camera-select").val(),
      });
    } else {
      document.getElementById("camera-select").disabled = true;
      $("#camera-select").val($("#camera-select option:first").val());
      chrome.runtime.sendMessage({
        type: "update-camera",
        id: $("#camera-select").val(),
      });
    }
    reset_cam_icon();
  });
  $("#mic-select").on("change", function () {
    chrome.runtime.sendMessage({
      type: "update-mic",
      id: $("#mic-select").val(),
    });
    reset_mic_icon();
  });
  $("#mic").on("click", function () {
    let isMicSelcted = document.getElementById("mic").checked;
    if (isMicSelcted) {
      document.getElementById("mic-select").disabled = false;
      $("#mic-select").val($("#mic-select option:nth-child(2)").val());
      chrome.runtime.sendMessage({
        type: "update-mic",
        id: $("#mic-select").val(),
      });
    } else {
      document.getElementById("mic-select").disabled = true;
      $("#mic-select").val($("#mic-select option:first").val());
      chrome.runtime.sendMessage({
        type: "update-mic",
        id: $("#mic-select").val(),
      });
    }
    reset_mic_icon();
  });

  // Change recording area
  $(document).on("click", "#space-toggle input[type='radio']", function () {
    let recordType = $("input:radio[name=record-space]:checked").val();
    chrome.runtime.sendMessage({
      type: "recording-type",
      recording: recordType,
    });
    chrome.storage.sync.set({ type: recordType });
  });

  $(document).on("click", ".type:not(.type-active)", function () {
    if ($(".type-active").attr("id") == "tab-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/tab-only.svg")
        );
    } else if ($(".type-active").attr("id") == "desktop") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/desktop.svg")
        );
    } else if ($(".type-active").attr("id") == "camera-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/camera-only.svg")
        );
    }
    $(".type-active").removeClass("type-active");
    $(this).addClass("type-active");
    if (
      $(".type-active").attr("id") == "camera-only" &&
      ($("#camera-select").val() == "disabled" ||
        $("#camera-select").val() == "disabled-access")
    ) {
      $("#record").attr("disabled", true);
    } else {
      $("#record").removeAttr("disabled");
    }
    if ($(this).attr("id") == "tab-only") {
      $(this)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/tab-only-active.svg")
        );
    } else if ($(this).attr("id") == "desktop") {
      $(this)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/desktop-active.svg")
        );
    } else if ($(this).attr("id") == "camera-only") {
      $(this)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL(
            "./assets/images/popup/camera-only-active.svg"
          )
        );
    }
    chrome.runtime.sendMessage({
      type: "recording-type",
      recording: $(".type-active").attr("id"),
    });
    chrome.storage.sync.set({ type: $(".type-active").attr("id") });
  });

  // Start recording
  $("#record").on("click", function () {
    record();
  });

  $("#screenshot").on("click", function () {
    chrome.runtime.sendMessage({ type: "screenshot" });
  });

  // Show more dropdown
  $("#more").on("click", function (e) {
    if ($("#more-select").hasClass("countactive")) {
      $("#more-select").removeClass("countactive");
    } else {
      $("#more-select").addClass("countactive");
    }
  });

  // Show countdown dropdown
  $("#count-select").on("click", function (e) {
    e.preventDefault();
    if ($("#countdown-select").hasClass("countactive")) {
      $("#countdown-select").removeClass("countactive");
    } else {
      $("#countdown-select").addClass("countactive");
    }
  });

  // Change countdown time
  $(".countdown").on("click", function () {
    $("#count-select").html($(this).html().slice(0, -1));
    chrome.storage.sync.set({
      countdown_time: parseInt($(this).html().slice(0, -1)),
    });
    $("#countdown-select").removeClass("countactive");
  });

  // Hide countdown dropdown when clicking anywhere but the dropdown
  $(document).on("click", function (e) {
    if (
      !$("#countdown-select").is(e.target) &&
      $("#countdown-select").has(e.target).length === 0 &&
      !$("#count-select").is(e.target) &&
      $("#count-select").has(e.target).length === 0
    ) {
      $("#countdown-select").removeClass("countactive");
    }
    if (
      !$("#more-select").is(e.target) &&
      $("#more-select").has(e.target).length === 0 &&
      !$("#more").is(e.target) &&
      $("#more").has(e.target).length === 0
    ) {
      $("#more-select").removeClass("countactive");
    }
  });

  // Go to the shortcuts page in Chrome (workaround, chrome:// links are a local resource so they can't be triggered via a normal link)
  $("#shortcuts").on("click", function (e) {
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts",
    });
  });

  // Higher quality or smaller file size for the recording
  $("#quality").on("click", function (e) {
    chrome.storage.sync.get(["quality"], function (result) {
      if (result.quality == "max") {
        chrome.storage.sync.set({
          quality: "min",
        });
        $("#quality").html(chrome.i18n.getMessage("highest_quality"));
      } else {
        chrome.storage.sync.set({
          quality: "max",
        });
        $("#quality").html(chrome.i18n.getMessage("smaller_file_size"));
      }
    });
  });

  // Receive messages
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.type == "loaded") {
      window.close();
    } else if (request.type == "sources") {
      getCamera(request.devices);

      // Allow user to start recording
      if (!recording) {
        $("#record-text").html(chrome.i18n.getMessage("start_recording"));
        $(".record-options").show();
      }
      $("#record").removeAttr("disabled");
    } else if (request.type == "sources-audio") {
      getAudio(request.devices);

      // Allow user to start recording
      if (!recording) {
        $("#record-text").html(chrome.i18n.getMessage("start_recording"));
        $(".record-options").show();
      }
      $("#record").removeAttr("disabled");
    } else if (request.type == "sources-noaccess") {
      $("#camera-select").html(
        "<option value='disabled-access'>" +
          chrome.i18n.getMessage("disabled_allow_access") +
          "</option>"
      );
      chrome.storage.sync.set({
        camera: "disabled-access",
      });

      // Allow user to start recording
      if (!recording) {
        $("#record-text").html(chrome.i18n.getMessage("start_recording"));
        $(".record-options").show();
      }
      if ($(".type-active").attr("id") != "camera-only") {
        $("#record").removeAttr("disabled");
      }
    } else if (request.type == "sources-loaded") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "camera-request",
        });
      });
    } else if (request.type == "sources-audio-noaccess") {
      audioRequest();
    }
  });

  //logout redirect
  document.getElementById("logout").onclick = () => {
    window.open(`${server_url}/accounts/logout/`, "_blank");
  };
});
