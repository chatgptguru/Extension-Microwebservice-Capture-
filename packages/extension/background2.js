////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////              DOCUMENTATION            ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ************************** Local Storage ( Cache )  usage Details *************************************//
//  1,  Video  Storage :
// ---------------------
//
//  Object : disbugVideoRecord
//  Value  : disbugVideoData
//				--> "BlobURL": To Store URL of the Recorded  Video,
//              --> "size"   :  Size of the Video
//
// 2, Image ( ScreenShot Storage ):
//--------------------------------
//
//   Object : disbugScreenShot
//   Value  : disbugScreenShotData
//              --> "screenShotArray": Array of ScreenShots ,
//		        --> "N_ScreenShots"  : Number of Screenshots
//
// 3, Timer ( For timing the Functions ):
//--------------------------------------
//
//   Object : keyRecordTime
//   Value  : totalSeconds   ( Total Seconds of Recording)
//
// 4, Logs ( All Network Logs )
//-----------------------------
//   Object : disbugEvidenceData
//   Value  : data   ( JSON Format )
//
// 5, VideoRecord ( Whether Video or Screenshot is Called)
//----------------------------------------------------------
//
//   Object : isVideoKey
//   Value  : isVideo    ( Boolean )

////////////////////////////-------- GLOBAL VARIABLES ----------------////////////////////////
// -- General Variables
var currentActiveTab; // Variable to store current Active Tab ID

var tabSpecificLogs = {};

function fixTabSpecificLogUndefined(tab_id) {
  if (tabSpecificLogs[tab_id] === undefined) {
    tabSpecificLogs[tab_id] = {
      eventByTabs: {},
      eventLogs: {},
      networkLogs: [],
      consoleLogs: [],
      latesteventSaved: null,
    };
  }
}

// Update the Current Tab-id in Global Location
chrome.tabs.onActivated.addListener((activeInfo) => {
  currentActiveTab = activeInfo.tabId;
  fixTabSpecificLogUndefined(currentActiveTab);
});

chrome.tabs.onRemoved.addListener(function (tabid, removed) {
  delete tabSpecificLogs[currentActiveTab];
});

// Clear the Local Storage of Video and Image ( if any from previous Iteration )
function clearChromeLocalStorage() {
  chrome.storage.local.remove(
    ["pashootVideoRecord", "pashootScreenShot"],
    function (value) {}
  );
}

function pad(val) {
  var valString = val + "";
  if (valString.length < 2) {
    return "0" + valString;
  } else {
    return valString;
  }
}

// injects the script to capture the network logs in the server
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  var c = `
  var s = document.createElement('script');\
  s.textContent =\`
  function captureXMLHttpRequest(recorder) {
    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;
    var setRequestHeader = XHR.setRequestHeader;

    // Collect data:
    XHR.open = function (method, url) {
        this._method = method;
        this._url = url;
        this._requestHeaders = {};
        this._startTime = (new Date()).toISOString();
        return open.apply(this, arguments);
    };

    XHR.setRequestHeader = function (header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
    };

    XHR.send = function (postData) {
        this.addEventListener('load', function () {
            var endTime = (new Date()).toISOString();

            if (recorder) {
                var myUrl = this._url ? this._url.toLowerCase() : this._url;
                if (myUrl) {

                    var requestModel = {
                        'uri': this._url,
                        'verb': this._method,
                        'time': this._startTime,
                        'headers': this._requestHeaders
                    };

                    if (postData) {
                        if (typeof postData === 'string') {
                            try {
                                requestModel['body'] = postData;
                            } catch (err) {
                                requestModel['transfer_encoding'] = 'base64';
                                requestModel['body'] = _.base64Encode(postData);
                            }
                        } else if (typeof postData === 'object' || typeof postData === 'array' || typeof postData === 'number' || typeof postData === 'boolean') {
                            requestModel['body'] = postData;
                        }
                    }
                    var responseHeaders = this.getAllResponseHeaders();

                    var responseModel = {
                        'status': this.status,
                        'time': endTime,
                        'headers': responseHeaders
                    };

                    if (this.responseType != 'document' && (this.responseType == 'blob' || this.responseText)) {
                        // responseText is string or null
                        try {
                            responseModel['body'] = this.responseText;
                        } catch (err) {
                            responseModel['transfer_encoding'] = 'base64';
                            responseModel['body'] = btoa(this.response);
                        }
                    }

                    var event = {
                        'request': requestModel,
                        'response': responseModel
                    };

                    recorder(event);
                }
            }
        });
        return send.apply(this, arguments);
    };

    return null;
}
recorder = function(network_event){
    var event = new CustomEvent("pashoot-network-event", {'detail': network_event});
    document.dispatchEvent(event)
}
captureXMLHttpRequest(recorder)
function get_short_url_from_full_url(full_url) {
    let short_url = full_url.substr(full_url.lastIndexOf('/')+1, ).split(':').splice(0,2).join(':')
    if(short_url.lastIndexOf(":")==0){
      short_url = "(index)"+short_url
    }
    return short_url
}
function get_console_location_from_stack(){
    
    try {
      throw new Error();
    } catch (ea) {
      full_url = ea.stack.substr(ea.stack.lastIndexOf('at ') + 3)
      let short_url = get_short_url_from_full_url(full_url)
      return ({"full_url": full_url, "short_url": short_url})
    }
}
function captureConsoleEvent(recorder){
  console.defaultLog = console.log.bind(console);
  console.log = function(){
      urls = get_console_location_from_stack()
      recorder({"type":"log", "datetime":Date().toLocaleString(), "value":Array.from(arguments), ...urls})
      console.defaultLog.apply(console, arguments);
  }
  console.defaultError = console.error.bind(console);
    console.error = function(){
        urls = get_console_location_from_stack()
        recorder({"type":"error", "datetime":Date().toLocaleString(), "value":Array.from(arguments), ...urls});
        console.defaultError.apply(console, arguments);
    }
  console.defaultWarn = console.warn.bind(console);
  console.warn = function(){
       urls = get_console_location_from_stack()
      recorder({"type":"warn", "datetime":Date().toLocaleString(), "value":Array.from(arguments), ...urls})
      console.defaultWarn.apply(console, arguments);
  }
  console.defaultDebug = console.debug.bind(console);
  console.debug = function(){
      urls = get_console_location_from_stack()
      recorder({"type":"debug", "datetime":Date().toLocaleString(), "value":Array.from(arguments), ...urls});
      console.defaultDebug.apply(console, arguments);
  }
  console.defaultInfo = console.info.bind(console);
  console.info = function(){
      urls = get_console_location_from_stack()
      recorder({"type":"info", "datetime":Date().toLocaleString(), "value":Array.from(arguments), ...urls});
      console.defaultInfo.apply(console, arguments);
  }
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorObj = {msg: msg, url: url, lineNo: lineNo, columnNo: columnNo, error: error}
    var full_url = url + ":" + lineNo+":"+columnNo
    let short_url = get_short_url_from_full_url(full_url)
    recorder({"type":"exception", "datetime":Date().toLocaleString(), "value": msg, extra: errorObj,  "full_url": full_url, "short_url": short_url});
    return false;
  }
  return null;
}
console_recorder = function(console_event){
  var event = new CustomEvent("pashoot-console-event", {'detail': console_event});
  document.dispatchEvent(event)
}
captureConsoleEvent(console_recorder)
\`
if(typeof injected == "undefined"){
document.head.appendChild(s);
var injected = 1;
}`;
  if (
    !tab.url.includes("chrome://") &&
    !tab.url.includes("chrome-error://") &&
    !tab.url.includes("chrome-extension://") &&
    !tab.url.includes("chrome.com")
  ) {
    chrome.tabs.executeScript({ code: c, runAt: "document_start" });
  }
});

function createEvidence() {
  fixTabSpecificLogUndefined(currentActiveTab);
  let evidence = {
    page_title: "",
    url: "",
    local_storage: {},
    target_html: "",
    target_selector: "",
    system_info: {},
    log_data: tabSpecificLogs[currentActiveTab].consoleLogs,
    event_by_tabs: tabSpecificLogs[currentActiveTab].eventByTabs,
    event_logs: tabSpecificLogs[currentActiveTab].eventLogs,
    network_logs: tabSpecificLogs[currentActiveTab].networkLogs,
  };

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    evidence.url = tabs[0].url;
    // listener in content.js (gets url, local_storage and system_info)
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "getBrowserData" },
      function (response) {
        if (response) {
          evidence.page_title = response.page_title;
          evidence.local_storage = response.local_storage;
          evidence.system_info = response.browser_data;
          evidence.target_html = response.target_html;
          evidence.target_selector = response.target_selector;
          evidence.browser_name = response.browser_name;
          evidence.os = response.os;
          evidence.locale = response.locale;
          evidence.screen_size = response.screen_size;
          evidence.viewport = response.viewport;
          evidence.density = response.density;
        }
        chrome.storage.local.set(
          { pashootEvidenceData: evidence },
          function (value) {}
        );
      }
    );
  });
}

var saveNetworkSteps = function (tab_id, msg) {
  tabSpecificLogs[tab_id].networkLogs.push(msg);
};
var saveConsoleLogs = function (tab_id, msg) {
  tabSpecificLogs[tab_id].consoleLogs.push(msg);
};
var saveEventSteps = function (tab_id, msg) {
  tabSpecificLogs[tab_id].eventLogs[msg.timestamp] = msg;
};

//get the events from content.js and call the respective function to save it in memory
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  fixTabSpecificLogUndefined(sender.tab.id);
  if (request.action == "eventLog") {
    saveEventSteps(sender.tab.id, request.msg);
  } else if (request.action == "networkLog") {
    saveNetworkSteps(sender.tab.id, request.msg);
  } else if (request.action == "consoleLog") {
    saveConsoleLogs(sender.tab.id, request.msg);
  }
});

// for screenshot
function captureScreen(screenCaptureCallBack) {
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.setZoom(currentActiveTab, 1.0);
    chrome.tabs.get(currentActiveTab, function (tab) {
      chrome.tabs.captureVisibleTab(
        null,
        { format: "png", quality: 50 },
        screenCaptureCallBack
      );
    });
  });
}

// ScreenShot Calling Function
function screenShotFunction() {
  captureScreen(screenCaptureCallBack);
}

// Function ScreenCapture Call Back
function screenCaptureCallBack(data) {
  createEvidence();
  chrome.storage.local.set({ pashootScreenShot: data }, function (value) {});

  chrome.tabs.create({ url: chrome.extension.getURL("report.html") });
}

const audioCtx = new AudioContext();
const destination = audioCtx.createMediaStreamDestination();
var output = new MediaStream();
var micsource;
var syssource;
var mediaRecorder = "";
var mediaConstraints;
var micstream;
var audiodevices = [];
var cancel = false;
var recording = false;
var tabid = 0;
var maintabs = [];
var camtabs = [];
var recording_type = "tab-only";
var pushtotalk;
var newwindow = null;
var micable = true;
var width = 1920;
var height = 1080;
var quality = "max";
var camerasize = "small-size";
var camerapos = { x: "10px", y: "10px" };
var isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

// Get list of available audio devices
getDeviceId();

chrome.runtime.onInstalled.addListener(function () {
  // Set defaults when the extension is installed
  chrome.storage.sync.set({
    toolbar: true,
    countdown: true,
    countdown_time: 3,
    flip: true,
    pushtotalk: false,
    camera: 0,
    mic: 0,
    type: "tab-only",
    quality: "max",
  });

  // Inject content scripts in existing tabs
  chrome.tabs.query({ currentWindow: true }, function gotTabs(tabs) {
    for (let index = 0; index < tabs.length; index++) {
      if (
        !tabs[index].url.includes("chrome://") &&
        !tabs[index].url.includes("chrome.com")
      ) {
        chrome.tabs.executeScript(tabs[index].id, {
          file: "./js/detect.js",
        });
      }
    }
  });
});

// Set up recording
function newRecording(stream) {
  // Show recording icon
  chrome.browserAction.setIcon({
    path: "../assets/extension-icons/logo-32-rec.png",
  });

  // Start Media Recorder
  if (quality == "max") {
    mediaConstraints = {
      mimeType: "video/webm;codecs=vp8,opus",
    };
  } else {
    mediaConstraints = {
      mimeType: "video/webm;codecs=vp8,opus",
      bitsPerSecond: 1000,
    };
  }
  mediaRecorder = new MediaRecorder(stream, mediaConstraints);
  injectContent(true);
}

const readAsArrayBuffer = function (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = (ev) => {
      reject(ev.error);
    };
  });
};

const injectMetadata = function (blob, recordedBlobs) {
  const { Decoder, Encoder, tools, Reader } = require("ts-ebml");
  const decoder = new Decoder();
  const reader = new Reader();
  reader.logging = false;
  reader.drop_default_duration = false;

  readAsArrayBuffer(blob).then((buffer) => {
    const elms = decoder.decode(buffer);
    elms.forEach((elm) => {
      reader.read(elm);
    });
    reader.stop();

    var refinedMetadataBuf = tools.makeMetadataSeekable(
      reader.metadatas,
      reader.duration,
      reader.cues
    );
    var body = buffer.slice(reader.metadataSize);
    blob = new Blob([refinedMetadataBuf, body], { type: blob.type });

    let videoURL = window.URL.createObjectURL(blob);

    pashootVideoData = {
      BlobURL: videoURL + "#t=" + recordedBlobs.length,
      length: recordedBlobs.length,
      size: recordedBlobs[0].size,
    };
    // Store the VideoURL , CHUNKS to local Storage
    chrome.storage.local.set(
      { pashootVideoRecord: pashootVideoData },
      function (value) {}
    );

    // Destroy recordedBlobs to Free Memory
    recordedBlobs = [];
    newwindow = window.open("report.html");
  });
};

// Save recording
function saveRecording(recordedBlobs) {
  createEvidence();
  let blob = new Blob(recordedBlobs, { type: "video/mp4;" });
  console.log("First blob");
  console.log(blob);
  injectMetadata(blob, recordedBlobs);
  // Destroy recordedBlobs to Free Memory
  recordedBlobs = [];
}

// Stop recording
function endRecording(stream, recordedBlobs) {
  // Show default icon
  chrome.browserAction.setIcon({
    path: "../assets/extension-icons/logo-32.png",
  });

  // Save recording if requested
  if (!cancel) {
    saveRecording(recordedBlobs);
  }

  // Hide injected content
  recording = false;
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: "end",
    });
  });

  // Stop tab and microphone streams
  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  if (micable) {
    micstream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
}

// Start recording the entire desktop / specific application
function getDesktop() {
  var constraints = {
    audio: true,
    video: true,
  };
  navigator.mediaDevices.getDisplayMedia(constraints).then(function (stream) {
    output = new MediaStream();
    if (stream.getAudioTracks().length == 0) {
      // Get microphone audio (system audio is unreliable & doesn't work on Mac)
      if (micable) {
        micsource.connect(destination);
        output.addTrack(destination.stream.getAudioTracks()[0]);
      }
    } else {
      syssource = audioCtx.createMediaStreamSource(stream);
      if (micable) {
        micsource.connect(destination);
      }
      syssource.connect(destination);
      output.addTrack(destination.stream.getAudioTracks()[0]);
    }
    output.addTrack(stream.getVideoTracks()[0]);

    // Set up media recorder & inject content
    newRecording(output);

    // Record desktop stream
    var recordedBlobs = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
      }
    };

    // When the recording is stopped
    mediaRecorder.onstop = () => {
      endRecording(stream, recordedBlobs);
    };

    // Stop recording if stream is ended via Chrome UI or another method
    stream.getVideoTracks()[0].onended = function () {
      cancel = false;
      mediaRecorder.stop();
    };
  });
}

// Start recording the current tab
function getTab() {
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabCapture.capture(
      {
        video: true,
        audio: true,
        videoConstraints: {
          mandatory: {
            chromeMediaSource: "tab",
            minWidth: width,
            minHeight: height,
            maxWidth: width,
            maxHeight: height,
            maxFrameRate: 60,
          },
        },
      },
      function (stream) {
        // Combine tab and microphone audio
        output = new MediaStream();
        syssource = audioCtx.createMediaStreamSource(stream);
        if (micable) {
          micsource.connect(destination);
        }
        syssource.connect(destination);
        output.addTrack(destination.stream.getAudioTracks()[0]);
        output.addTrack(stream.getVideoTracks()[0]);

        // Keep playing tab audio
        let audio = new Audio();
        audio.srcObject = stream;
        audio.play();

        // Set up media recorder & inject content
        newRecording(output);

        // Record tab stream
        var recordedBlobs = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedBlobs.push(event.data);
          }
        };

        // When the recording is stopped
        mediaRecorder.onstop = () => {
          endRecording(stream, recordedBlobs);
        };

        // Stop recording if stream is ended when tab is closed
        stream.getVideoTracks()[0].onended = function () {
          mediaRecorder.stop();
        };
      }
    );
  });
}

// Inject content scripts to start recording
function startRecording() {
  if (recording_type == "camera-only") {
    injectContent(true);
    recording = true;
  }
  getDeviceId();
  record();
}

// Get microphone audio and start recording video
function record() {
  // Get window dimensions to record
  chrome.windows.getCurrent(function (window) {
    width = window.width;
    height = window.height;
  });

  var constraints;
  chrome.storage.sync.get(["quality"], function (result) {
    quality = result.quality;
    chrome.storage.sync.get(["mic"], function (result) {
      // Set microphone constraints
      constraints = {
        audio: {
          deviceId: result.mic,
        },
      };

      // Start microphone stream
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (mic) {
          micable = true;
          micstream = mic;
          micsource = audioCtx.createMediaStreamSource(mic);

          // Check recording type
          if (recording_type == "desktop") {
            getDesktop();
          } else if (recording_type == "tab-only") {
            getTab();
          }
        })
        .catch(function (error) {
          micable = false;

          // Check recording type
          if (recording_type == "desktop") {
            getDesktop();
          } else if (recording_type == "tab-only") {
            getTab();
          }
        });
    });
  });
}

// Inject content script
function injectContent(start) {
  chrome.storage.sync.get(["countdown"], function (result) {
    chrome.tabs.getSelected(null, function (tab) {
      if (maintabs.indexOf(tab.id) == -1 && recording_type != "camera-only") {
        // Inject content if it's not a camera recording and the script hasn't been injected before in this tab
        tabid = tab.id;
        chrome.tabs.executeScript(tab.id, {
          file: "./js/libraries/jquery-3.5.1.min.js",
        });
        chrome.tabs.executeScript(tab.id, {
          file: "./js/libraries/fabric.min.js",
        });
        chrome.tabs.executeScript(tab.id, {
          file: "./js/libraries/pickr.min.js",
        });
        chrome.tabs.executeScript(tab.id, {
          file: "./js/libraries/arrow.js",
        });

        // Check if it's a new or ongoing recording
        if (start) {
          chrome.tabs.executeScript(
            tab.id,
            {
              code:
                "window.countdownactive = " +
                result.countdown +
                ';window.camerasize = "' +
                camerasize +
                '";window.camerapos = {x:"' +
                camerapos.x +
                '",y:"' +
                camerapos.y +
                '"};',
            },
            function () {
              chrome.tabs.executeScript(tab.id, {
                file: "./js/content.js",
              });
            }
          );
        } else {
          chrome.tabs.executeScript(
            tab.id,
            {
              code:
                'window.countdownactive = false;window.camerasize = "' +
                camerasize +
                '";window.camerapos = {x:"' +
                camerapos.x +
                '",y:"' +
                camerapos.y +
                '"};',
            },
            function () {
              chrome.tabs.executeScript(tab.id, {
                file: "./js/content.js",
              });
            }
          );
        }

        chrome.tabs.insertCSS(tab.id, {
          file: "./css/content.css",
        });
        chrome.tabs.insertCSS(tab.id, {
          file: "./css/libraries/pickr.css",
        });
        maintabs.push(tab.id);
      } else if (
        camtabs.indexOf(tab.id) == -1 &&
        recording_type == "camera-only"
      ) {
        // Inject content for camera recording if the script hasn't been injected before in this tab
        tabid = tab.id;
        chrome.tabs.executeScript(tab.id, {
          file: "./js/libraries/jquery-3.5.1.min.js",
        });

        // Check if it's a new or ongoing recording
        if (start) {
          chrome.tabs.executeScript(
            tab.id,
            {
              code: "window.countdownactive = " + result.countdown,
            },
            function () {
              chrome.tabs.executeScript(tab.id, {
                file: "./js/cameracontent.js",
              });
            }
          );
        } else {
          chrome.tabs.executeScript(
            tab.id,
            {
              code: "window.countdownactive = false;",
            },
            function () {
              chrome.tabs.executeScript(tab.id, {
                file: "./js/cameracontent.js",
              });
            }
          );
        }

        chrome.tabs.insertCSS(tab.id, {
          file: "./css/cameracontent.css",
        });
        camtabs.push(tab.id);
      } else {
        // If the current tab already has the script injected
        if (recording_type == "camera-only") {
          if (start) {
            chrome.tabs.sendMessage(tab.id, {
              type: "restart-cam",
              countdown: result.countdown,
            });
          } else {
            chrome.tabs.sendMessage(tab.id, {
              type: "restart-cam",
              countdown: false,
            });
          }
        } else {
          if (start) {
            chrome.tabs.sendMessage(tab.id, {
              type: "restart",
              countdown: result.countdown,
            });
          } else {
            chrome.tabs.sendMessage(tab.id, {
              type: "restart",
              countdown: false,
              camerapos: camerapos,
              camerasize: camerasize,
            });
          }
        }
      }
    });
  });
}

// Switch microphone input
function updateMicrophone(id, request) {
  // Save user preference for microphone device
  chrome.storage.sync.set({
    mic: request.id,
  });
  // Check recording type
  if (recording) {
    if (recording_type == "camera-only") {
      // Send microphone device ID to the camera content script
      chrome.tabs.sendMessage(tab.id, {
        type: "update-mic",
        mic: request.id,
      });
    } else {
      // Stop current microphone stream
      micstream.getTracks().forEach(function (track) {
        track.stop();
      });

      // Start a new microphone stream using the provided device ID
      chrome.tabs.getSelected(null, function (tab) {
        navigator.mediaDevices
          .getUserMedia({
            audio: {
              deviceId: id,
            },
          })
          .then(function (mic) {
            micstream = mic;
            micsource = audioCtx.createMediaStreamSource(mic);
            micsource.connect(destination);
          })
          .catch(function (error) {
            chrome.tabs.sendMessage(tab.id, {
              type: "no-mic-access",
            });
          });
      });
    }
  }
}

// Recording controls
function pauseRecording() {
  mediaRecorder.pause();
}

function resumeRecording() {
  mediaRecorder.resume();
}

function stopRecording(save) {
  tabid = 0;

  // Show default icon
  chrome.browserAction.setIcon({
    path: "../assets/extension-icons/logo-32.png",
  });

  chrome.tabs.getSelected(null, function (tab) {
    // Check if recording has to be saved or discarded
    if (save == "stop" || save == "stop-save") {
      cancel = false;
    } else {
      cancel = true;
    }

    // Check if it's a desktop or tab recording (recording done in background script)
    if (recording_type != "camera-only") {
      mediaRecorder.stop();
    } else {
      recording = false;
    }

    // Remove injected content
    chrome.tabs.sendMessage(tab.id, {
      type: "end",
    });
  });
}

// Get a list of the available audio devices
function getDeviceId() {
  audiodevices = [];
  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    devices.forEach(function (device) {
      if (device.kind == "audioinput") {
        audiodevices.push({
          label: device.label,
          id: device.deviceId,
        });
      }
    });
    chrome.runtime.sendMessage({ type: "audio-done", devices: audiodevices });
  });
}

// Mute/unmute microphone and system audio
function audioSwitch(source, enable) {
  if (recording_type != "camera-only") {
    // Start a new microphone stream if one doesn't exist already
    if (!micable) {
      chrome.tabs.getSelected(null, function (tab) {
        navigator.mediaDevices
          .getUserMedia({
            audio: true,
          })
          .then(function (mic) {
            micable = true;
            micstream = mic;
            micsource = audioCtx.createMediaStreamSource(mic);
            micsource.connect(destination);
          })
          .catch(function (error) {
            chrome.tabs.sendMessage(tab.id, {
              type: "no-mic-access",
            });
          });
      });
    }
    if (source == "mic" && !enable && micable) {
      micsource.disconnect(destination);
    } else if (source == "mic" && enable && micable) {
      micsource.connect(destination);
    } else if (source == "tab" && !enable) {
      syssource.disconnect(destination);
    } else {
      syssource.connect(destination);
    }
  } else {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "mic-switch",
        enable: enable,
      });
    });
  }
}

// Update camera device
function updateCamera(request) {
  chrome.tabs.getSelected(null, function (tab) {
    // Save user preference
    chrome.storage.sync.set({
      camera: request.id,
    });

    // Send user preference to content script
    chrome.tabs.sendMessage(tab.id, {
      type: request.type,
      id: request.id,
    });
  });
}

// Toggle push to talk
function pushToTalk(request, id) {
  chrome.tabs.getSelected(null, function (tab) {
    pushtotalk = request.enabled;

    // Send user preference to content script
    chrome.tabs.sendMessage(tab.id, {
      type: request.type,
      enabled: request.enabled,
    });
  });
}

// Countdown is over / recording can start
function countdownOver() {
  if (recording_type == "camera-only") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "camera-record",
      });
    });
  } else {
    if (!recording) {
      mediaRecorder.start(1000);
      recording = true;
    }
  }
}

// Inject content when tab redirects while recording
function pageUpdated(sender) {
  chrome.tabs.getSelected(null, function (tab) {
    if (sender.tab.id == tab.id) {
      if (recording && tab.id == tabid && recording_type == "tab-only") {
        injectContent(false);
        getDeviceId();
        tabid = 0;
      } else if (recording && recording_type == "desktop") {
        injectContent(false);
        getDeviceId();
        tabid = 0;
      }
      maintabs.splice(maintabs.indexOf(tabid), 1);
    }
  });
}

// Changed tab selection
chrome.tabs.onActivated.addListener(function (tabId, changeInfo, tab) {
  if (!recording) {
    // Hide injected content if the recording is already over
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "end",
      });
    });
  } else if (
    recording &&
    recording_type == "desktop" &&
    maintabs.indexOf(tabId) == -1
  ) {
    // Inject content for entire desktop recordings (content should be on any tab)
    injectContent(false);
  }
});

chrome.tabs.onRemoved.addListener(function (tabid, removed) {
  // Stop recording if tab is closed in a camera only recording
  if (tabid == tabid && recording && recording_type == "camera-only") {
    recording = false;

    // Show default icon
    chrome.browserAction.setIcon({
      path: "../assets/extension-icons/logo-32.png",
    });
    tabid = 0;
  }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener(function (command) {
  if (recording) {
    if (command == "stop") {
      stopRecording(command);
    } else if (command == "pause/resume") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "pause/resume",
        });
      });
    } else if (command == "cancel") {
      stopRecording(command);
    } else if (command == "mute/unmute" && !pushtotalk) {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "mute/unmute",
        });
      });
    }
  }
});

// Listen for messages from content / popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "record") {
    clearChromeLocalStorage();
    startRecording();
    // set is video =  true
    chrome.storage.local.set({ isVideoKey: true }, function (value) {});
  } else if (request.type == "pause") {
    pauseRecording();
    sendResponse({ success: true });
  } else if (request.type == "resume") {
    resumeRecording();
    sendResponse({ success: true });
  } else if (request.type == "stop-save") {
    stopRecording(request.type);
  } else if (request.type == "stop-cancel") {
    stopRecording(request.type);
  } else if (request.type == "audio-request") {
    sendResponse({ devices: audiodevices });
  } else if (request.type == "update-mic") {
    updateMicrophone(request.id, request);
  } else if (request.type == "update-camera") {
    updateCamera(request);
  } else if (request.type == "audio-switch") {
    audioSwitch(request.source, request.enable);
  } else if (request.type == "camera-list") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: request.type,
        devices: request.devices,
        audio: request.audio,
      });
    });
  } else if (request.type == "flip-camera") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: request.type,
        enabled: request.enabled,
      });
    });
  } else if (request.type == "push-to-talk") {
    pushtotalk(request);
  } else if (request.type == "switch-toolbar") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: request.type,
        enabled: request.enabled,
      });
    });
  } else if (request.type == "countdown") {
    countdownOver();
  } else if (request.type == "recording-type") {
    recording_type = request.recording;
  } else if (request.type == "record-request") {
    sendResponse({ recording: recording });
  } else if (request.type == "pause-camera") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "pause-camera",
      });
    });
  } else if (request.type == "resume-camera") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "resume-record",
      });
    });
  } else if (request.type == "no-camera-access") {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "no-camera-access",
      });
    });
  } else if (request.type == "audio-check") {
    getDeviceId();
  } else if (request.type == "end-camera-recording") {
    recording = false;
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "end-recording",
      });
    });
  } else if (request.type == "sources-loaded") {
    pageUpdated(sender);
  } else if (request.type == "camera-size") {
    camerasize = request.size;
  } else if (request.type == "camera-pos") {
    camerapos.x = request.x;
    camerapos.y = request.y;
  } else if (request.type == "screenshot") {
    clearChromeLocalStorage();
    screenShotFunction();
    chrome.storage.local.set({ isVideoKey: false }, function (value) {});
  }
});

// open a new tab after the extension installation
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://pashoot.re-invented.xyz/welcome" });
  }
});
