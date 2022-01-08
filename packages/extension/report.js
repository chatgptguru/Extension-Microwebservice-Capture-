var SeverData = [];
$( document ).ready(function() {
  console.log( window.location );
  issue_get_url = server_url + "/issue?id="+window.location.search.split("=")[1];
  $.ajax({
    type: "GET",
    url: issue_get_url,
    headers: headers,
    dataType: "json",
    crossDomain: true,
    timeout: 9990000,
    success: function (data) {
      console.log(data.issue);
      var videoTag = document.getElementById("bg-pashoot-video");
      var imageTag = document.getElementById("bg-pashoot-image");
      document.getElementById("title").value = data.issue.title;
      document.getElementById("description").value = data.issue.description;
      var myconsoleResult = {"pashootEvidenceData":{log_data:data.issue.logs.log_data}};
      var mynetworkResult = {"pashootEvidenceData":{network_logs:data.issue.logs.network_logs}};
      var myeventkResult = {"pashootEvidenceData":{network_logs:data.issue.logs.event_logs}};
      var mylocalstorageResult = {"pashootEvidenceData":{network_logs:data.issue.logs.local_storage}};
      
      if(data.issue.screenshot != ""){
        imageTag.src = data.issue.screenshot;
        videoTag.src = "";
        videoTag.parentElement.style.display = 'none';
        imageTag.parentElement.style.display = 'block';
      }else{
        imageTag.src = "";
        videoTag.src = data.issue.video;
        videoTag.parentElement.style.display = 'block';
        imageTag.parentElement.style.display = 'none';
      }
      populate_console_logs(myconsoleResult);
      populate_network_logs(mynetworkResult);
      populate_events_logs(myeventkResult);
      populate_localstorage_logs(mylocalstorageResult);
    },
    error: function (data) {
      console.log(data)
    }
  });
  
});
var texts = ["Uploading your logs...",
  "Uploading Attachments...",
  "Almost done...",
  "Posting it to your issue trackers...",
  "Uploading attachments to your issue trackers...",
  "Breathe in...", "Breathe out...",
  "Breathe in...", "Breathe out...",
  "Breathe in...", "Breathe out...",
  "Breathe in...", "Breathe out...",
  "Breathe in...", "Breathe out...",
]
var index = 0;
function processStatus(){
  $('#processing_text').html(texts[index]);
  if(index < ( texts.length ) ){
    index++;
  }else{
     $('#processing_text').html('Uploading might look slow due to the size of logs and video you upload.');
  }
  
}
$("#advanced-toggle").hide();
$("#advanced-btn").click(function(){
  $("#advanced-toggle").toggle();
});

 
// tooltip
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// form_validation

var form = document.getElementById("issueForm");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  title = document.getElementById("title").value;
  description = document.getElementById("description").value;
  project = null
  project_elem = document.getElementById("project_select")
  if(project_elem){
    project = document.getElementById("project_select").value;
  }
  issue_type_element = document.getElementById('issuetype')
  id_list_element = document.getElementById('idList')

  if (issue_type_element) {
    issue_type = document.getElementById('issuetype').value;
    if (issue_type === "" || issue_type === "null"){
      document.getElementById("issuetype").className = "form-control is-invalid";
      document.getElementById("board_select_alert").style.display = "block";
      return false;
    }
  }
  if (id_list_element) {
    id_list = document.getElementById('idList').value;
    if (id_list === "" || id_list === "null"){
      document.getElementById("idList").className = "form-control is-invalid";
      document.getElementById("board_select_alert").style.display = "block";
      return false;
    }
  } 

  if (project_elem && (project === "" || project === null || project === "null")) {
      document.getElementById("project_select").className = "form-control is-invalid";
      document.getElementById("project_select_alert").style.display = "block";
      document.getElementById("board_select_alert").style.display = "none";
      return false;
  }else if (title === "" || title === null || title === "null") {
      document.getElementById("title").className = "form-control is-invalid";
      document.getElementById("title-alert").style.display = "block";
      return false;
  } else if (description === "" || description === null || description === "null") {
      document.getElementById("description").className = "form-control is-invalid";
      document.getElementById("description-alert").style.display = "block";
      return false;
  } else {
    annotate_and_submit();
  }
});

if(server_url=="http://localhost:8000"){
  document.getElementById("raw_data_nav_item").style.display = '';
}
// Receive the Stored BLOB URL from the Local Storage

function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === "?"
    ? queryString.substr(1)
    : queryString
  ).split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
}

window.dataStorage = {
  // storage solution aimed at replacing jQuerys data function
  _storage: new WeakMap(),
  put: function (element, key, obj) {
    if (!this._storage.has(element)) {
      this._storage.set(element, new Map());
    }
    this._storage.get(element).set(key, obj);
  },
  get: function (element, key) {
    if (this._storage && this._storage.get(element)) {
      return this._storage.get(element).get(key);
    } else {
      return null;
    }
  },
  has: function (element, key) {
    return this._storage.has(element) && this._storage.get(element).has(key);
  },
  remove: function (element, key) {
    var ret = this._storage.get(element).delete(key);
    if (!this._storage.get(element).size === 0) {
      this._storage.delete(element);
    }
    return ret;
  },
};

var evidence_data = null;
var original_screenshot_data = null;
var screenshot_data = null;
var headers = null;
var request_data = {};
var videoObjectBase64 = null;
var videoBlobURL;
var videosize;
var userDetails = null;
var is_edit_mode = false;
let imageElem = document.getElementById("bg-pashoot-image");

function annotate_and_submit(){
  if(is_edit_mode){
    try{
      exportAnnotatedImage(afterAnnotate);
    } catch (e) {
      submit_issue()
    }
  }else{
    submit_issue()
  }
}

function submit_issue() {
  document.getElementById('processing_text').style.display = "block";
  index = 0;
  processStatus();
  setInterval(processStatus, 5000);
  document.getElementById('submit_issue').style.display = "none";
  document.getElementById('submiting_issue_btn').style.display = "block";
  request_data.title = document.getElementById("title").value;
  request_data.description = document.getElementById("description").value;
  request_data.project = null;
  if(document.getElementById("project_select")){
    request_data.project = document.getElementById("project_select").value;
  }
  $("#custom_dropdowns select").each(function () {
    request_data[""];
    request_data["pashoot_dest_prop_" + $(this).attr("name")] = $(this)
      .find(":selected")
      .val();
  });
  $("#custom_dropdowns input").each(function () {
    request_data[""];
    request_data["pashoot_dest_prop_" + $(this).attr("name")] = $(this)
      .val();
  });
  var metadata = {
    browser: evidence_data.browser_name,
    url: evidence_data.url,
    page_title: evidence_data.page_title,
    html_selector: evidence_data.html_selector,
    os: evidence_data.os,
    window: evidence_data.window,
    viewport: evidence_data.viewport,
    screen_size: evidence_data.screen_size,
    target_selector: evidence_data.target_selector,
    locale: evidence_data.locale,
  };

   var logs = {
     target_html: evidence_data.target_html,
     log_data: evidence_data.log_data,
     system_info: evidence_data.system_info,
     console_logs: '',
     network_logs: '',
     local_storage: '',
     event_logs: '',
  };
  


  if ($("#consoleLogSwitch").is(':checked')) {
    logs['console_logs'] = evidence_data.console_logs
  }
  if ($("#networkLogSwitch").is(':checked')) {
    logs['network_logs'] = evidence_data.network_logs
  }
  if ($("#localStorageSwitch").is(':checked')) {
    logs['local_storage'] = evidence_data.local_storage
  }
  if ($("#eventLogSwitch").is(':checked')) {
    logs['event_logs'] = evidence_data.event_logs
  }


  request_data.logs = logs;
  request_data.metadata = metadata;
  request_data.extra_properties = {};
  request_data.screenshot = screenshot_data;
  request_data.video = videoObjectBase64;
  request_data.event_by_tabs = {};
  var issue_post_url = server_url + "/issues"
  
  console.log({request_data})
  $.ajax({
    type: "POST",
    url: issue_post_url,
    headers: headers,
    data: request_data,
    dataType: "json",
    crossDomain: true,
    timeout: 9990000,
    success: function (data) {
      alert("Saved Successfully");
      document.getElementById("submit_issue").style.display = 'block';
      document.getElementById("submiting_issue_btn").style.display='none';
    },
    error: function (data) {
      console.log(data)
      document.getElementById('submit_issue').style.display = "block";
      document.getElementById('submiting_issue_btn').style.display = "none";
      document.getElementById('processing_text').style.display = 'none';
      alert("Something went wrong! Please submit the issue or contact Pashoot team to resolve the issue")
    }
  });
}

$("#logSwitch").on("change", (function(){
  if(this.checked){
    $("#report-details").show()
  } else {
    $("#report-details").hide()
  }
}));


// Get video Strage Parameters
var VideoRecorded = false;

chrome.storage.local.get("isVideoKey", function (val) {
  if (val.isVideoKey) {
    // Video
    getVideoElements();
  } else {
    getScreenShotElements();
  }
});

function populate_console_logs(result) {
  console.log("result",result);
  data = result.pashootEvidenceData;
  var items = "";

  console.log({console:data.log_data})
  if ((data.log_data).length > 0) {
    $.each(data.log_data, function (i, entry) {
    if (entry) {
      var message_class = entry.type;
      var short_url = entry.short_url;
      if (Array.isArray(entry.value)) {
        var message = entry.value.join();
      } else {
        var message = entry.value;
      }
      var icon_class = "";
      if (entry.type == "error" || entry.type == "exception") {
        message_class = "danger";
        icon_class = "times-circle";
      }
      if (entry.type == "warn") {
        message_class = "warning";
        icon_class = "exclamation-triangle";
      }
      if (entry.type == "info" || entry.type == "debug") {
        icon_class = "info-circle";
      }
      items += `<div class='text-${message_class} border-bottom border-${message_class}'><i class="fa fa-${icon_class} p-1"></i>${message}<span class="text-muted float-right">${short_url}</span></div>`;
    }
    });
  } else { 
    items += `<div class='text-center mt-5 h4 text-muted'>*No logs detected in this site</div>`
  }
  
  document.getElementById("console_log").innerHTML = items;
}

function populate_network_logs(result) {
  data = result.pashootEvidenceData;

  var network_logs = "";

  console.log({netowrk:data.network_logs})
  if ((data.network_logs).length > 0) {
    $.each(data.network_logs, function (key, value) {
      if(value){
        network_logs += `
          <div class="card">
              <div class="card-header text-left" id="heading${key}">
                  <h2 class="mb-0 p-0">
                  <button class="btn text-left" type="button" data-toggle="collapse" data-target="#collapse${key}" aria-expanded="true" aria-controls="collapse${key}">
                      (${value.request.verb}) <span class="text-lowercase">${value.request.uri} </span>  - ${value.response.status}
                  </button>
                  </h2>
              </div>

              <div id="collapse${key}" class="collapse" aria-labelledby="headingOne" data-parent="#network_log">
                  <div class="card-body json-container" id="json-body">
                  Request Headers:<pre id="req_headers_${key}"></pre>
                  Request Body:<pre id="req_body_${key}"></pre>
                  Response Headers:<pre id="res_headers_${key}"></pre>
                  Response Body:<pre id="res_body_${key}"></pre>
                  </div>
              </div>
          </div>`;
      }

  });
  } else { 
    network_logs += `<div class='text-center mt-5 h4 text-muted'>*No API requests available</div>`;
  }

  document.getElementById("network_log").innerHTML = network_logs;

  data = result.pashootEvidenceData;

  function networkLogsTree(jsonData, location){
    var data = "";
    if(typeof jsonData === 'object'){
        if(Object.keys(jsonData).length > 0){
            data = JsonView.createTree(jsonData);
            JsonView.render(data, location);
        }else{
            location.innerHTML = '    Empty Object';
        }    
    }else if(typeof jsonData === 'string'){
        data = JsonView.createTree(JSON.stringify({'data': jsonData}));
        JsonView.render(data, location);
    }else if(typeof jsonData === 'null'){
        data = JsonView.createTree(JSON.stringify({'data': 'null'}));
        JsonView.render(data, location);
    }else{
        data = JsonView.createTree(JSON.stringify({'data': 'undefined'}));
        JsonView.render(data, location);
    }
  }

  function jsonParser(response_data, location){
      try{
          networkLogsTree(JSON.parse(response_data), location);
      }catch(err){
          networkLogsTree(response_data, location);
      }
  }
  $.each(data.network_logs, function (key, value) {
    if(value){
      networkLogsTree(value.request.headers, document.querySelector(`#req_headers_${key}`));
      jsonParser(value.request.body, document.querySelector(`#req_body_${key}`));
      networkLogsTree(value.response.headers, document.querySelector(`#res_headers_${key}`));
      jsonParser(value.response.body, document.querySelector(`#res_body_${key}`));
    }
  });
}

function populate_events_logs(result) {
  data = result.pashootEvidenceData;
  var event_logs = "";
  if (Object.keys(data.event_logs).length > 0) {
    $.each(data.event_logs, function (key, value) {
      if (value.event_type == "click") {
        event_logs += `<tr><td class="p-1"><div class='col-sm-11'><i class="fa fa-mouse-pointer p-1"></i>Click on <code class="text-muted">&lt;<span class="text-lowercase">${value.target}</span>&gt;${value.value}&lt;/<span class="text-lowercase">${value.target}</span>&gt;</code></div></td></tr>`;
      }
      if (value.event_type == "form_change") {
        event_logs += `<tr><td class="p-1"><div class='col-sm-11'><i class="fa fa-align-justify p-1"></i>Form changed on <code class="text-muted">&lt; <span class="text-lowercase">${value.target}</span>&gt;</code> to '${value.value}'</div></td></tr>`;
      }
    });
  } else { 
    event_logs += `<div class='text-center mt-5 h4 text-muted'>*No user events in this site</div>`;
  }
  
  document.getElementById("events_data").innerHTML = event_logs;
}

function populate_localstorage_logs(result) {
  data = result.pashootEvidenceData;
  var local_items = "";
  if (Object.keys(data.local_storage).length > 0) {
    local_items += `<tr>
                <th scope="col" class="p-2">Key</th>
                <th scope="col" class="p-2">Value</th>
                </tr>`
    $.each(data.local_storage, function (key, value) {
      local_items += `
        <tr>
        <td class="p-1 font-weight-bold">${key}</td>
        <td class="p-1">${value}</td>
        </tr>
        `
    });
  } else {
    local_items += `<div class='text-center mt-5 h4 text-muted'>*No local storage in this site</div>`;
  }
  document.getElementById("local_storage_data").innerHTML = local_items;
}

// Get evidence data and populate the logs
chrome.storage.local.get(["pashootEvidenceData"], function (result) {
  document.getElementById("jscontent").innerHTML = JSON.stringify(
    result,
    undefined,
    2
  );
  evidence_data = result.pashootEvidenceData;


  populate_console_logs(result);
  populate_network_logs(result);
  populate_events_logs(result);
  populate_localstorage_logs(result);
});

function resizeVideoElement(videoElem) {
  container_height = document.getElementById("report-details").offsetHeight;
  video_height = document.getElementById("bg-pashoot-video").offsetHeight;
  video_width = document.getElementById("bg-pashoot-video").offsetWidth;
  video_ratio = video_height / video_width;
  videoElem.height = container_height;
  videoElem.width = videoElem.height / video_ratio;
}

function getVideoElements() {
  chrome.storage.local.get(["pashootVideoRecord"], function (value) {
    videoBlobURL = value.pashootVideoRecord.BlobURL;
    videosize = value.pashootVideoRecord.size;
    document.getElementById("button-edit-1").style.display = "none";
    let videoElem = document.getElementById("bg-pashoot-video");
    videoElem.src = videoBlobURL;
    videoElem.currentTime = 0; // TO make sure that the video is Seeked to the Last Position
    // videoElem.load()
    setTimeout(() => {
      resizeVideoElement(videoElem);
    }, 1000);
    var xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.onload = function () {
      var recoveredBlob = xhr.response;
      var reader = new FileReader();
      reader.onload = function () {
        var base64data = reader.result;
        videoObjectBase64 = base64data;
      };
      reader.readAsDataURL(recoveredBlob);
    };

    xhr.open("GET", videoBlobURL);
    xhr.send();
  });

  document
    .querySelectorAll(".bg-media-image-container")
    .forEach((a) => (a.style.display = "none"));
}

function getScreenShotElements() {
  chrome.storage.local.get(["pashootScreenShot"], function (value) {
    imageElem.src = value.pashootScreenShot;
    original_screenshot_data = value.pashootScreenShot;
    screenshot_data = value.pashootScreenShot;
  });
  document
    .querySelectorAll(".bg-media-video-elem")
    .forEach((a) => (a.style.display = "none"));
}

function insert_item_into_parent(item, parent_div){
  item_div = document.createElement("div");
  label = document.createElement("label");
  if (provider === 'trello') {
    label.innerHTML = `<i class="fa fa-trello" aria-hidden="true"></i>` + ' ' + item.label;
  } else if (provider === 'jira') {
    label.innerHTML = `<i class="fab fa-jira aria-hidden"></i>` + ' ' + item.label;
    var str = `*Summary:*

*Steps to reproduce:*
1.
2.

*Expected result:*

*Actual Result:*
          `;
          document.getElementById('description').value = str;
  } else { }
  label.htmlFor = item.field_name;
  if (item.type == "dropdown") {
    select_item = document.createElement("select");
    select_item.name = item.field_name;
    select_item.id = item.field_name;
    select_item.className = "form-control";
    select_item.required = true;
    var option = document.createElement("option");
    option.value = null;
    option.text = "Select the " + item.label;
    select_item.appendChild(option);
    sub_item_div = null;
    for (list_item of item.lists) {
      var option = document.createElement("option");
      option.value = list_item["id"];
      option.text = list_item["name"];
      select_item.appendChild(option);
      if(list_item['fields']){
        dataStorage.put(option,"hasFields", 'true')
        dataStorage.put(option,"provider",provider)
        dataStorage.put(option,"fields",list_item['fields'])
        dataStorage.put(option,"fields_div", item.field_name+"_fields")
        select_item.onchange = select_item_onchange;
        sub_item_div = document.createElement("div");
        sub_item_div.id = item.field_name+"_fields"
        console.log(item.field_name+"_fields")
      } 
    }
    item_div.appendChild(label);
    item_div.appendChild(select_item);
    if(sub_item_div){
      item_div.appendChild(sub_item_div);
    }
  } else if (item.type="string") {
    input_item = document.createElement("input");
    input_item.name = item.field_name;
    input_item.type = 'text'
    if(item.placeholder){
      input_item.placeholder = item.placeholder
    }
    input_item.id = item.field_name;
    input_item.className = "form-control";
    input_item.required = true;
    item_div.appendChild(label);
    item_div.appendChild(input_item);
  }
  parent_div.appendChild(item_div);
}

function select_item_onchange(event){
  parent_div = document.getElementById(event.target.name+"_fields");
  parent_div.className = "mt-3";
  parent_div.innerHTML = "";
  fields = dataStorage.get(
    event.target.options[select_item.selectedIndex],
    "fields"
  );
  if(fields){
    for (field of fields) {
      insert_item_into_parent(field, parent_div)
    }
  }
}

function select_proj_onchange(event) {
   var str1 = `**Summary:**

**Steps to reproduce:**
1.
2.

**Expected result:**

**Actual Result:**
          `;
          document.getElementById('description').value = str1;
  project_dropdown_div = document.getElementById("project_dropdowns");
  project_dropdown_div.className = "mt-3";
  project_dropdown_div.innerHTML = "";
  select_proj = document.getElementById("project_select");
  editor_items = dataStorage.get(
    select_proj.options[select_proj.selectedIndex],
    "editor_items"
  );
  provider = dataStorage.get( select_proj.options[select_proj.selectedIndex],'provider')
  if (editor_items) {
    for (item of editor_items) {
      insert_item_into_parent(item, project_dropdown_div)
    }
  }
}

chrome.cookies.get({ url: server_url, name: "user" }, (cookie) => {
  if (cookie.value && cookie.value !== "null") {
    userDetails = parseQuery(cookie.value);
    token = userDetails.token.slice(0, -1);
    email = userDetails.email;
    headers = {
      Authorization: "Token " + token,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    $.ajax({
      url: server_url + "/api/project",
      type: "GET",
      // Fetch the stored token from localStorage and set in the header
      headers: headers,
      success: function (response_data) {
        if (!$.trim(response_data)) {
          // if user has no projects
          $("#no-project-warn").removeClass('d-none')
        } else {
          dropdown_div = document.getElementById("custom_dropdowns");
          dropdown_div = document.getElementById("custom_dropdowns");
          project_div = document.createElement("div");
          label = document.createElement("label");
          label.innerHTML = "Project";
          label.htmlFor = "project_select";
          select_proj = document.createElement("select");
          select_proj.name = "project";
          select_proj.id = "project_select";
          select_proj.className = "form-control";
          var option = document.createElement("option");
          option.value = null;
          option.text = "Select the project";
          select_proj.appendChild(option);

          
          for (proj of response_data) {
            var option = document.createElement("option");
            option.value = proj["uid"];
            option.text = proj["name"];
            if (
              proj.destinations.length &&
              proj.destinations[0].properties.editor_items
            ) {
              dataStorage.put(
                option,
                "editor_items",
                proj.destinations[0].properties.editor_items
              );
              dataStorage.put(option,"provider",proj.destinations[0].provider)
            }
            select_proj.appendChild(option);
          }
          project_div.appendChild(label);
          project_div.appendChild(select_proj);
          var project_alert_div = document.createElement("div");
          project_alert_div.id = "project_select_alert";
          project_alert_div.className = "invalid-feedback";
          project_alert_div.innerHTML = "Please select the project";
          project_div.appendChild(project_alert_div);
          dropdown_div.appendChild(project_div);

          project_dropdown_div = document.createElement("div");
          project_dropdown_div.id = "project_dropdowns";
          dropdown_div.appendChild(project_dropdown_div);
          var board_alert_div = document.createElement("div");
          board_alert_div.id = "board_select_alert";
          board_alert_div.className = "invalid-feedback";
          board_alert_div.innerHTML = "This field is required";
          dropdown_div.appendChild(board_alert_div);

          select_proj.onchange = select_proj_onchange;
        }
      },
    });
  }
});


////////////// ----- IMAGE ANNOTATION ----- /////////////////
var _width;
var _height;
var options;
var exportParameters;
var annotatedImage;    // Saves only annotation alone
var reducedScreenshotImage ;

function exportAnnotatedImage()
{
    $(".bg-media-image-container").annotate("export",exportParameters);
}

async function afterAnnotate (annotatedImage)
{

    // Resize screenshot 
    reducedScreenshotImage = await resizedataURL(screenshot_data, _width, _height);
    // get the instance of merge-images and merge the images
    await mergeImages([reducedScreenshotImage,annotatedImage] ).then(
        mergedImage =>  {
            // Update the source of the current image
            screenshot_data = mergedImage;
            // Hide the Save Button and enable edit Button
            document.getElementById("button-reset-1").style.display = "none";
            document.getElementById("button-edit-1").style.display = "inline";

            submit_issue();

        });

    // Update the image in 

}

function removeAnnotation()
{
    imageElem.src = original_screenshot_data;

    $(".bg-media-image-container").annotate("destroy");

    // Button
    document.getElementById("button-edit-1").style.display = "inline";
    document.getElementById("button-reset-1").style.display = "none";
}

function setAnnotate(initAnnotate,_width,_height)
{
    // Set up parameters for Annotation 
    options = {
        width: _width,			// Width of canvas
        height: _height,		// Height of canvas
        color:"red", 			// Color for shape and text
        type : "rectangle",		// default shape: can be "rectangle", "arrow" or "text"
        images: null,			// Array of images path : ["images/image1.png", "images/image2.png"]
        linewidth:2,			// Line width for rectangle and arrow shapes
        fontsize:"20px",		// font size for text
        bootstrap: true,		// Bootstrap theme design
        position: "top",		// Position of toolbar (available only with bootstrap)
        idAttribute: "id",		// Attribute to select image id.
        selectEvent: "change",	// listened event to select image
        unselectTool: false	,	// display an unselect tool for mobile
        onExport: function(image){ annotatedImage = image ; afterAnnotate(annotatedImage); }	// Action when export function is called, with data uri as params (default log to console);
    }

    // Set up parameters for Exporting the image 
    exportParameters = {
        type: "image/png"
    }

    // initialise the Annotation library
    initAnnotate();
 
}


function initAnnotate()
{
    $(".bg-media-image-container").annotate(options);

    document.getElementById("button-reset-1").style.display = "inline";
    document.getElementById("button-edit-1").style.display = "none";

    document.getElementsByClassName("btn-group")[0].style.bottom = "-58px";
    document.getElementsByClassName("btn-group")[0].style.removeProperty('top');
    document.getElementsByClassName("btn-group")[0].style.left = "400px";

}

function getImageHeight()
{
    _width = imageElem.clientWidth;
    _height = imageElem.clientHeight;
    is_edit_mode = true;

    setAnnotate(initAnnotate,_width,_height);
}


// Trigger Edit Image
document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById("button-edit-1").addEventListener("click" ,function() {getImageHeight();});
    document.getElementById("button-reset-1").addEventListener("click" ,function() {removeAnnotation();});
  })



var element = document.getElementsByClassName('bg-media-image-container')[0];
element.style.position = null;
element.style.top = null;
element.style.left = null;



// Takes a data URI and returns the Data URI corresponding to the resized image at the wanted size.
function resizedataURL(datas, wantedWidth, wantedHeight){
    return new Promise(async function(resolve,reject){

        // We create an image to receive the Data URI
        var img = document.createElement('img');

        // When the event "onload" is triggered we can resize the image.
        img.onload = function()
        {        
            // We create a canvas and get its context.
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            // We set the dimensions at the wanted size.
            canvas.width = wantedWidth;
            canvas.height = wantedHeight;

            // We resize the image with the canvas method drawImage();
            ctx.drawImage(this, 0, 0, wantedWidth, wantedHeight);

            var dataURI = canvas.toDataURL();

            // This is the return of the Promise
            resolve(dataURI);
        };

        // We put the Data URI in the image's src attribute
        img.src = datas;

    })
}

/// ---- END OF IMAGE ANOTATION  --- ///

