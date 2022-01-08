valid_navigator_keys = [
    "productSub",
    "vendor",
    "cookieEnabled",
    "appVersion",
    "platform",
    "userAgent"
]

function getUniqueSelector(elSrc) {
    try{
        if (!(elSrc instanceof Element)) return;
        var sSel,
            aAttr = ['name', 'value', 'title', 'placeholder', 'data-*'], // Common attributes
            aSel = [],
            // Derive selector from element
            getSelector = function (el) {
                // 1. Check ID first
                // NOTE: ID must be unique amongst all IDs in an HTML5 document.
                // https://www.w3.org/TR/html5/dom.html#the-id-attribute
                if (el.id) {
                    aSel.unshift('#' + el.id);
                    return true;
                }
                aSel.unshift(sSel = el.nodeName.toLowerCase());
                // 2. Try to select by classes
                if (el.className && el.className.trim) {
                    aSel[0] = sSel += '.' + el.className.trim().replace(/ +/g, '.');
                    if (uniqueQuery()) return true;
                }
                // 3. Try to select by classes + attributes
                for (var i = 0; i < aAttr.length; ++i) {
                    if (aAttr[i] === 'data-*') {
                        // Build array of data attributes
                        var aDataAttr = [].filter.call(el.attributes, function (attr) {
                            return attr.name.indexOf('data-') === 0;
                        });
                        for (var j = 0; j < aDataAttr.length; ++j) {
                            aSel[0] = sSel += '[' + aDataAttr[j].name + '="' + aDataAttr[j].value + '"]';
                            if (uniqueQuery()) return true;
                        }
                    } else if (el[aAttr[i]]) {
                        aSel[0] = sSel += '[' + aAttr[i] + '="' + el[aAttr[i]] + '"]';
                        if (uniqueQuery()) return true;
                    }
                }
                // 4. Try to select by nth-of-type() as a fallback for generic elements
                var elChild = el,
                    sChild,
                    n = 1;
                while (elChild = elChild.previousElementSibling) {
                    if (elChild.nodeName === el.nodeName) ++n;
                }
                aSel[0] = sSel += ':nth-of-type(' + n + ')';
                if (uniqueQuery()) return true;
                // 5. Try to select by nth-child() as a last resort
                elChild = el;
                n = 1;
                while (elChild = elChild.previousElementSibling) ++n;
                aSel[0] = sSel = sSel.replace(/:nth-of-type\(\d+\)/, n > 1 ? ':nth-child(' + n + ')' : ':first-child');
                if (uniqueQuery()) return true;
                return false;
            },
            // Test query to see if it returns one element
            uniqueQuery = function () {
                try{
                    return document.querySelectorAll(aSel.join('>') || null).length === 1;
                } catch (e) {
                    return false;
                }
            };
        // Walk up the DOM tree to compile a unique selector
        while (elSrc.parentNode) {
            if (getSelector(elSrc)) return aSel.join(' > ');
            elSrc = elSrc.parentNode;
        }
    } catch (e) {
        return null;
    }
}

function getMiscBrowserData() {
    const nVer = navigator.appVersion;
    const currentBrowserData = {};
    let browserName = navigator.appName;

    // browserName = nVer.match(/(firefox|msie|chrome|safari)[/\s]([\d.]+)/ig)[0];
    if (nVer.match(/(firefox|msie|chrome|safari)[/\s]([\d.]+)/ig)) {
        browserName = nVer.match(/(firefox|msie|chrome|safari)[/\s]([\d.]+)/ig)[0];
    } else {
        browserName = 'Unknown';
    }
    let OSName = 'Unknown OS';
    if (nVer.indexOf('Win') !== -1) OSName = 'Windows';
    if (nVer.indexOf('Mac') !== -1) OSName = 'MacOS';
    if (nVer.indexOf('X11') !== -1) OSName = 'UNIX';
    if (nVer.indexOf('Linux') !== -1) OSName = 'Linux';

    currentBrowserData.browserName = browserName;
    currentBrowserData.os = OSName;
    currentBrowserData.navigatorInfo = navigator;
    currentBrowserData.locale = navigator.language;

    return currentBrowserData;
}
// get the metdata from the page using browser
chrome.runtime.onMessage.addListener(
    function (request, sender, callback) {
        if (request.action === "getBrowserData") {
            let unique_selector = "";

            var keyCount = localStorage.length;
            var localStorageObject = {}

            for (var index = 0; index < keyCount; index++) {
                key = localStorage.key(index);
                localStorageObject[key] = localStorage.getItem(key);
            }

            var navigatorObject = {};

            for (var key in navigator) {
                if (valid_navigator_keys.indexOf(key) >= 0) {
                    navigatorObject[key] = navigator[key];
                }
            }
            miscdata = getMiscBrowserData()
            browserData = {
                page_title: document.getElementsByTagName("title")[0].innerHTML,
                local_storage: localStorageObject,
                browser_data: navigatorObject,
                target_html: null,
                target_selector: unique_selector,
                browser_name: miscdata.browserName,
                os: miscdata.os,
                locale: navigator.language,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                screen_size: `${screen.width}x${screen.height}`,
                density: window.devicePixelRatio,
            }
            callback(browserData);
        }

        if (request.action === "removeSelector") {
            elem = document.getElementById('pashoot-picker');
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
        }

        if (request.action === "postEvent") {
            callback();
        }

        return true;
    }
);

function send_event_to_bg(event) {
    chrome.runtime.sendMessage({
        action: "eventLog", msg: event, callback: function (response) {

        }
    });
}

function send_network_to_bg(event) {
    console.log({event})
    chrome.runtime.sendMessage({
        action: "networkLog", msg: event, callback: function (response) {

        }
    });
}
function send_console_to_bg(event) {
    chrome.runtime.sendMessage({
        action: "consoleLog", msg: event, callback: function (response) {

        }
    });
}


const truncate = (inner_text, length) => inner_text && inner_text.length > length ? `${inner_text.substring(0, length)}...` : inner_text;

// listen to mmouse events and send the data
document.body.addEventListener('mouseup', function (event) {
    const record_toolbar = document.getElementById('toolbar-record');
    if (!(record_toolbar!=null && (event.target === record_toolbar || record_toolbar.contains(event.target)))) {
        // save event for event clicks that are not from #toolbar-record
        send_event_to_bg({
            event_type: "click",
            target: event.target.nodeName,
            unique_selector: getUniqueSelector(event.target),
            value: truncate(event.target.innerText, 50),
            html: null,
            details: {},
            timestamp: Date.now(),
        });
    }
    
}, true);
// listen to formchange events and send the data
var form_elem = document.querySelectorAll('input:not([type=password]), textarea, select');
for (var i = 0; i < form_elem.length; i++) {
    form_elem[i].addEventListener('change', function (event) {
        send_event_to_bg({
            event_type: "form_change",
            target: event.target.nodeName,
            unique_selector: getUniqueSelector(event.target),
            details: {
                id: event.target.getAttribute('id'),
                name: event.target.getAttribute('name')
            },
            value: event.target.value,
            html: null,
            timestamp: Date.now(),
        })
    })
}

// addEventListener Network log
document.addEventListener("pashoot-network-event", function(e) {
    send_network_to_bg(e.detail)
  });

  document.addEventListener("pashoot-console-event", function(e) {
    send_console_to_bg(e.detail)
  });
