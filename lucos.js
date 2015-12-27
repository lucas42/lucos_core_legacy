(function _lucos(){
	//"use strict";
	var _islite = true, globallinkhandlers = [];
	/*var msgListeners = {
		'navlink' : function (msg, source) {
			var style = (msg.style) ? msg.style : 'position: absolute; z-index: 1000; font-size: 40px; margin: 0.5em; padding: 0.5em; background: black; color: white; top: 0; left: 0; -webkit-border-radius: 2em 0 0 2em; background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#4c4c4c), color-stop(19%,#595959), color-stop(100%,#131313));';
			var linktext = (msg.text) ? msg.text : "Back";
			var back = document.createElement('div');
			back.setAttribute("style", style);
			back.appendChild(document.createTextNode(linktext));
			back.addEventListener('click', function () {
				if (msg.callback) {
					source.postMessage(msg.callback, '*');
				} else {
					history.back();
				}
			});
			document.body.appendChild(back);
		}
	}*/
 
	if (!('localStorage' in window)) {
		window.localStorage = (function _fakestorage() {
			var storage = {};
			function setItem(key, val) {
				storage[key] = val;
			}
			function removeItem(key) {
				delete storage[key];
			}
			function getItem(key) {
				if (key in storage) return storage[key];
				else return null;
			}
			return {
				setItem: setItem,
				removeItem: removeItem,
				getItem: getItem,
			}
		})();
	}
	if (!('JSON' in window)) {
		
		window.JSON = (function _badJSON() {
			function stringify(item) {
				var output, kk, ii, ll;
				switch (typeof item) {
					case "object":
						output = '{';
						for (kk in item) {
							output += stringify(kk) + ': ';
							output += stringify(item[kk]) + ', ';
						}
						output += "}";
						return output.replace(/, }/, '}');
					case "Array":
						output = '[';
						ll = item.length;
						for (ii = 0; ii<ll; ii++) {
							output += stringify(item[ii]);
							if (ii != ll-1) output += ',';
						}
						output += ']';
						return output;
					case "number":
						return item;
					case "string":
						return '"'+item.replace(/"/, '\"')+'"';
					case "boolean":
						if (item) return 'true';
						return 'false';
					default:
						throw "Unknown type: "+(typeof item);
				}
			}
			
			/**
			 * Not safe for untrusted sources
			 */
			function parse(json) {
				try {
					return eval('(' + json + ')');
				} catch (e) {
					throw "Error parsing JSON: " + e + "\n"+json;
				}
			}
			return {
				stringify: stringify,
				parse: parse,
			};
		})();
	}
	
	if (typeof document.head == 'undefined') document.head = document.getElementsByTagName('head')[0];
	var pubsub = (function _pubsub(){
		var msgListeners = {}, triggered = {}, msg;
		window.addEventListener('message', function _parsewindowmessage(event) {
			try {
				msg = JSON.parse(event.data);
			} catch (e) {
				event.preventDefault();
				return;
			}
			if (msg.type) trigger(msg.type, msg, event.source, false);

		}, false);
		
		/**
		 * Listen for messages of a given type
		 */
		function listen(type, callback, internalonly) {
			if (!msgListeners[type]) msgListeners[type] = [];
			msgListeners[type].push({
				callback: callback,
				ext: !internalonly
			});
		}
		function unlisten(type, callback) {
			if (msgListeners[type]) for (var ii in msgListeners[type]) {
				if (msgListeners[type][ii].callback == callback) return delete msgListeners[type][ii];
			}
			return false;
		}
				  
		/*
		* Calls callback if message has already happened (passing most recent value), then listens for future calls
		*
		* Only works for internal messages
		* 
		*/
		function listenExisting(type, callback) {
			listen(type, callback, true);
			if (triggered.hasOwnProperty(type)) {
				callback(triggered[type], window);
			}

		}
		
		/*
		 * Calls callback if message has already happened, otherwise listens for it once
		 * 
		 * Only works for internal messages
		 * 
		 */
		function waitFor(type, callback) {
			function callbackwrapper(msg) {
				unlisten(type, callbackwrapper, true);
				callback(msg, window);
			}
			listenExisting(type, callbackwrapper, true);
		}
		
		function trigger(type, msg, source, internal) {
			if (internal) triggered[type] = msg;
			if (msgListeners[type]) for (var ii in msgListeners[type]) {
				if (internal || msgListeners[type][ii].ext) msgListeners[type][ii].callback(msg, source);
			}
		}
		function send(type, msg, target) {
			if (!target || target == window) return trigger(type, msg, window, true);
			if (!msg) msg = {};
			msg.type = type;
			target.postMessage(JSON.stringify(msg), '*');
		}
		return {
			send: send,
			listen: listen,
			unlisten: unlisten,
			waitFor: waitFor,
			listenExisting: listenExisting
		}
	})();
	
	(function _DOMManipulation() {
		/**
		 * Adds a class to an element
		 * 
		 * @param String newClass the class to add
		 * 
		 * @return Element is chainable
		 */
		Element.prototype.addClass = function (newClass) {
			var classString = this.getAttribute("class");
			if (classString) {

				// If the class is already there, don't readd it
				var regex = new RegExp("(^|\\s)"+newClass+"($|\\s)", 'ig');
				if (classString.match(regex)) return this;

				classString += " ";
			} else {
				classString = "";
			}
			classString += newClass;
			this.setAttribute("class", classString);
			return this;
		};
		/**
		 * Removes a class from an element
		 * 
		 * @param String oldClass the class to remove (may contain regex)
		 * 
		 * @return Element is chainable
		 */
		Element.prototype.removeClass = function (oldClass) {
			var classString = this.getAttribute("class");
			if (!classString) return this;
			
			// JS doesn't support negative lookbehinds
			var regex = new RegExp("(?:^|\\s)"+oldClass+"(?!\\S)", 'ig');
			classString = classString.replace( regex , '' );
			this.setAttribute("class", classString);
			return this;
		};
	})();
	
					   
	var navBarAdded = false;
	var navBarDisabled = false;
	var navBarMenus = {};
	var navBarMenuButtons = {};
	function addNavBar(title) {
		if (navBarDisabled) return;
		if (navBarAdded) {
			if (title) document.getElementById('lucos_navbar_title').firstChild.nodeValue = title;
			return;
		}
		
		// Only include the navbar on top level frames
		if (window != window.top) return;
		var navbar = document.createElement('div');
		navbar.id='lucos_navbar';
		navbar.setAttribute("style", "height: 30px; z-index:1000; color: white; position: absolute; left: 0; right: 0; top: 0; font-size: 18px; background-color: black; background-image: -webkit-gradient(linear, 0 100%, 0 0, color-stop(0, transparent), color-stop(0.15, transparent), color-stop(0.9, rgba(255, 255, 255, 0.4))); font-family: Georgia, serif");
		
		var homeimg = document.createElement('img');
		homeimg.src = 'http://l42.eu/logo.png';
		homeimg.setAttribute("alt", "lucOS");
		homeimg.setAttribute("style", "float: left; height: 25px; padding: 2.5px 2%; cursor: pointer; max-width: 20%; border: none;");
		var homeimglnk = document.createElement("a");
		//homeimglnk.setAttribute("target", "_blank");
		homeimglnk.setAttribute("href", "http://l42.eu/");
		homeimglnk.appendChild(homeimg);
		/*homeimglnk.addEventListener("click", function (event) { 
			if (event.button !== 0) return;
			parent.postMessage(JSON.stringify({type: 'home' }), '*');
			event.preventDefault();
		}, false);*/
		navbar.appendChild(homeimglnk);
		
		if (!title) title = document.title.replace(/lucos\s*-*\s*/i, '');
		var titleNode = document.createElement('span');
		titleNode.appendChild(document.createTextNode(title));
		titleNode.setAttribute("style", "text-align: center; display: block; line-height: 30px; font-weight: bold; position: absolute; width: 50%; margin: 0 25%; z-index: -1; overflow: hidden; height: 30px; text-overflow: ellipsis; white-space: nowrap;");
		titleNode.id='lucos_navbar_title';
		navbar.appendChild(titleNode);
		
		var timeNode = document.createElement('time');
		timeNode.appendChild(document.createTextNode(''));
		timeNode.setAttribute("style", "font-family: \"Courier New\", Courier, monospace; margin: 0 1em;");
		var timeNode_timeout;
		function updateNavBarTime(force) {
			if (timeNode_timeout) clearTimeout(timeNode_timeout);
			function leadingZero(num) {
				num += '';
				if (num.length == 1) return '0'+num;
				if (num.length > 1) return num;
				return '0';
			}
			var date = new Date(getTime(force));
			timeNode.firstChild.nodeValue = leadingZero(date.getHours()) + ':' + leadingZero(date.getMinutes()) + ':' + leadingZero(date.getSeconds());
			timeNode_timeout=setTimeout(updateNavBarTime, 1000-date.getMilliseconds());
		}
		updateNavBarTime();
		timeNode.addEventListener('click', function _timenodecolour() { timeNode.style.color='red'; updateNavBarTime(true); }, false);
		pubsub.listen('offsetupdate', function _timenodecolourend(offset) { if (offset.fresh) timeNode.style.color=''; });
		titleNode.appendChild(timeNode);
		
		
		function createButton(name, img, hide, callback) {
			
			var menuButton = document.createElement('span');
			if (img) {
				var imgNode = document.createElement("img");
				imgNode.src = img;
				imgNode.setAttribute("alt", name);
				imgNode.setAttribute("title", name);
				imgNode.setAttribute('style', "height: 20px; margin: 5px;");
				menuButton.appendChild(imgNode);
			} else {
				menuButton.appendChild(document.createTextNode(name));
			}		
			menuButton.setAttribute("style", "float: right; line-height: 30px; padding: 0 2%; cursor: pointer; font-weight: bold;");
			if (hide) menuButton.style.display = 'none';
			menuButton.setAttribute("class", "lucos_navbar_menubutton");
			navBarMenuButtons[name] = menuButton;
			if (callback) menuButton.addEventListener("click", callback, false);
			navbar.appendChild(menuButton);
			return menuButton;
		}
		
		function createMenu(name, img) {
			if (navBarMenus.hasOwnProperty(name)) return false;
			var menuNode = document.createElement('ul');
			menuNode.setAttribute("style", "position: absolute; top: 30px; border: ridge thick black; list-style-type: none; background: white; right: 80px; max-width: 95%; min-width: 100px; font-size: 15px;");
			menuNode.setAttribute('class', 'lucos_menu');	
			menuNode.style.display = 'none';
			createButton(name, img, true, function (event) {
				if (event.button !== 0) return;
				menuNode.style.display = (menuNode.style.display == 'none') ? 'block' : 'none';
			});
			window.addEventListener("click", function (event) {
				menuNode.style.display = 'none';
			}, true);
			navBarMenus[name] = menuNode;
			document.body.appendChild(menuNode);
			return true;
		}
		/*createButton('music', 'http://l42.eu/music.png', false, function (event) {
			if (event.button !== 0) return;
			pubsub.send('showmusic', null, top);
		});
		window.addEventListener("click", function _hidemusic(event) {
			pubsub.send('hidemusic', null, top);
		}, true);*/
		createMenu('options', 'http://l42.eu/cog.png');
		(function _controlDevButton() {
			var devmodebutton = createButton('Dev', null, !detect.isDev(), function () { window.location.reload() });
			devmodebutton.style.color = '#9CF';
			devmodebutton.style.fontFamily = "sans-serif";
			devmodebutton.style.textDecoration = "underline overline";
			devmodebutton.style.webkitTransitionProperty = 'background-color';
			//devmodebutton.style.webkitTransitionDuration = '0';
			pubsub.listen('devmodechange', function _devmodechangetoggledevbutton() {
				devmodebutton.style.webkitTransitionDuration = '0';
				devmodebutton.style.backgroundColor = '#9CF';
				devmodebutton.style.webkitTransitionDuration = '2s';
				devmodebutton.style.display = (detect.isDev()) ? 'block' : 'none';
				// Not quite sure why this timeout is required :S
				window.setTimeout(function () { devmodebutton.style.backgroundColor = 'transparent'; }, 0);
			}, true);
		})();
		
		// Swallow any clicks on the navbar to stop pages handling them
		navbar.addEventListener("click", function _stopnavbarpropagation(event) { event.stopPropagation(); }, false);
		
		document.body.style.paddingTop = '30px';
		document.body.addClass("lucos_gotnavbar");
		document.body.insertBefore(navbar, document.body.firstChild);
		navBarAdded = true;
		pubsub.send('navbaradded', navbar);
		
		// Check whether the user is loggedin
		// Wrap in a try/catch incase the browser doesn't support CORS
		try {
			net.get('https://auth.l42.eu/whoami', null, function (req) {
				var data = JSON.parse(req.responseText);
				if (data.agentid) createButton('Logged in');
			}, null, true);
		} catch (err) {
		}
	}
	function disableNavBar() {
		navBarDisabled = true;
		// TODO: Maybe remove the nav bar if it's already present at this point
	}
	
	function addMenuItem(item, callback, menu) {
		pubsub.waitFor('navbaradded', function _navbaradded() {
			var link;
			if (!navBarMenus.hasOwnProperty(menu)) menu = 'options';
			var itemNode = document.createElement("li");
			if (typeof(item) != "object") item = document.createTextNode(item);
			if (typeof(callback) == 'function') {
				itemNode.appendChild(item);
				itemNode.addEventListener('click', callback, false);
				itemNode.setAttribute("style", "cursor: pointer");
			} else if (typeof callback == 'string') {
				link = document.createElement("a");
				link.setAttribute("href", callback);
				link.appendChild(item);
				link.setAttribute("style", "text-decoration: none; color: inherit;");
				itemNode.appendChild(link);
			} else {
				throw "Callback wrong type";
			}
			navBarMenus[menu].appendChild(itemNode);
			navBarMenuButtons[menu].style.display = 'inline';
		});
	}
	
	// Set up stuff that should happen as soon as possible
	(function _startup() {
		
		// Stuff to do in fullscreen mode
		if (window.navigator.standalone) {
			
			// Quick escape button to get out of frames
			//addMenuItem("Escape", function _escapefromframes(event) { if (event.button !== 0) return; top.location.href = location.href });
			
			// Use location.href for any internal links so that the twonkPad doesn't break out of app and use safari
			globallinkhandlers.push(function _keeplinksinstandalone(url) {
				if (url == 'http://l42.eu/') localStorage.removeItem("laststandaloneurl");
				location.href = url;
				return true;
			});
			
			if (location.pathname != '/preload' && location.hostname != 'l42.eu') {
				
				// Remember the last url used to make the behaviour more app-like
				var lasturl = localStorage.getItem("laststandaloneurl");
				if (lasturl && lasturl != location.href && document.referrer == 'http://l42.eu/') location.href = lasturl;
				else localStorage.setItem("laststandaloneurl", location.href);
			}
		
		// Stuff to do inside browser chrome
		} 
		
		pubsub.waitFor('ready', function _ready() {
			addNavBar();
			(function _onlineoffline() {
				if (typeof window.navigator.onLine == "undefined") {
					document.body.addClass("lucos_online");
				}
				if (detect.isOnline()) document.body.addClass("lucos_online");
				else document.body.addClass("lucos_offline");
				window.addEventListener("online", function _goneOnline() {
					document.body.removeClass("lucos_offline").addClass("lucos_online");
					pubsub.send("online");
				}, true);
				window.addEventListener("offline", function _goneOffline() {
					document.body.removeClass("lucos_online").addClass("lucos_offline");
					pubsub.send("offline");
				}, true);
			})();
			
			
			/**
			 * Adds a click handler to all links in a DOMElement
			 * 
			 * @param {DOMElement} parent The parent of all the links
			 */
			function addOnClick(parent) {
				if (!parent.getElementsByTagName) return;
				var links = parent.getElementsByTagName('a');
				var len = links.length;
				for (var ii=0; ii < len; ii++) {
					if (links[ii].getAttribute("data-gotglobalhandlers")) continue;
					links[ii].setAttribute("data-gotglobalhandlers", true);
					links[ii].addEventListener('click', function _handlelinkclick(event) {
						var ii = 0, ll;
						// Only handle left clicks
						if (event.button !== 0) return;
						
						// Allow target=_blank to do their own thing
						if (this.getAttribute("target") == "_blank") return;
						
						// Loop through all the click handlers until one returns true
						for (ll = globallinkhandlers.length; ii<ll; ii++) {
							if (globallinkhandlers[ii](this.getAttribute("href"))) {
								event.preventDefault();
								break;
							}
						}
					}, false);
				}
			}
		
			// Add onclicks to any links in the body
			addOnClick(document.body);
			
			// Listen for new links being added
			document.addEventListener("DOMNodeInserted", function _handlelinkoninsertednode(event) { 
				addOnClick(event.relatedNode);
			}, false);
			
			// Stuff to do when in browser (parent window only
			if (!window.navigator.standalone && window == window.top) {
				
				var defaultStyleHeight = document.body.style.height;
				
				// Hide any location bars which can be hidden
				function hideLocationBar() {
					
					// Don't bother scrolling if the location bar isn't in view
					if (document.body.scrollTop > 1) return;
					document.body.style.height = 'auto';
					var oldWindowHeight = window.innerHeight;
					document.body.style.height = window.outerHeight + 'px';
					window.scrollTo(window.pageXOffset, 1);
					
					// Wait half a second to see the effect
					setTimeout(function _checkwindowchange() {
						
						// If there's no effect, then revert the body height to its original value
						if (oldWindowHeight == window.innerHeight ) document.body.style.height = defaultStyleHeight;
					}, 500);
				}
				
				/*
				 * Debounce call to hideLocationBar by 0.1 seconds
				 */
				var locbartimeout;
				function _delayHideLocationBar() {
					if (locbartimeout) clearTimeout(locbartimeout);
					locbartimeout = setTimeout(hideLocationBar, 100);
				}
				window.addEventListener('resize', _delayHideLocationBar, false);
				hideLocationBar();
			
			}
		}, true);
		function load() {
			
			// Remove event listeners so it doesn't get called twice
			document.removeEventListener("DOMContentLoaded", load, false);
			window.removeEventListener("load", load, false);
			pubsub.unlisten("bootloaderReady", _onBootloaderReady);
				
			// Trigger a ready event
			pubsub.send('ready');
		}
		function _onBootloaderReady() {
			
			// It's possible for the bootloader to be ready before the DOM, in which case ignore
			if (document.body) load();
		}
		
		// Use DOMContentLoaded with load as a fallback incase the browser dosen't support the former
		// If both were fired before lucos.js was loaded, then listen for the bootloaderReady message
		document.addEventListener("DOMContentLoaded", load, false);
		window.addEventListener("load", load, false);
		pubsub.listen("bootloaderReady", _onBootloaderReady, true);
	})();

	(function _manifestStuff() {
		function _done(e) {
			//console.log('good', e);
			_finished('done');
		}
		function _error(e) {
			//console.log('bad', e);
			_finished('error');
		}
		function _canupdate(e) {
			//console.log("update ready", e);
			_finished('updateready');
		}
		function _finished(result) {
			
			// If opened in a frame, tell the parent that we're done
			if (window != window.parent) {
				pubsub.send('preload', {result: result, section: 'manifest'}, window.parent);
			}
			pubsub.send('manifestready', {result: result});
		}
		if (typeof applicationCache != 'object') return _error();
		if (applicationCache.status == applicationCache.UNCACHED) return _done();
		if (applicationCache.status == applicationCache.IDLE) return _done();
		if (applicationCache.status == applicationCache.UPDATEREADY) return _canupdate();
		if (applicationCache.status == applicationCache.OBSOLETE) return _error();
		if (applicationCache.status == applicationCache.CHECKING && window != window.parent) {
			
			// If still checking for updates, tell parent window that it's ready
			pubsub.send('preload', {result: "ready", section: 'manifest'}, window.parent);
		}
		applicationCache.addEventListener("noupdate", _done, false);
		applicationCache.addEventListener("cached", _done, false);
		applicationCache.addEventListener("updateready", _canupdate, false);
		applicationCache.addEventListener("obsolete", _error, false);
		applicationCache.addEventListener("error", _error, false);
	}());

	var getTime = (function () {
		var timeFrame;
		pubsub.listen("offsetupdate", function (newoffset) {
			localStorage.setItem("lucos_NTPOffset", newoffset.offset);
		});
		return function _getTime(force) {
			function clientTime() {
				return new Date().getTime();
			}
			function fetchOffset() {
				
				// Browsers which don't support window messaging can just use their own time.
				if (typeof window.postMessage == 'undefined') return;
				if (timeFrame) {
					pubsub.send("time_offset", { force: force}, timeFrame.contentWindow);
				} else {
					pubsub.listen("api_ready", function _timeAPIReady(params, source) {
						if (source != timeFrame.contentWindow) return;
						fetchOffset();
					});
					timeFrame = document.createElement("iframe");
					timeFrame.src = "https://am.l42.eu/";
					timeFrame.setAttribute("style", "height: 0; width: 0; display:none;");
					document.body.appendChild(timeFrame);
				}
			}
			var savedOffset = parseInt(localStorage.getItem('lucos_NTPOffset'));
			
			// If the offset isn't saved, then request an update and just use client time.
			if (!savedOffset) {
				fetchOffset();
				return clientTime();
			}
			
			if (force) fetchOffset();
			return clientTime() + savedOffset;
		}
	})();
	var speech = (function () {
		var speech = {};
		var speakFrame;
		speech.send = function (text) {
			//noop until API is ready
		}
		speech.getButton = function getButton() {

			// Browsers which don't support window messaging can just ignore speech.
			if (typeof window.postMessage == 'undefined') return;

			// Create an iframe to load the speech button
			speakFrame = document.createElement("iframe");

			pubsub.listen("api_ready", function _speechAPIReady(params, source) {
				if (source != speakFrame.contentWindow) return;
						  
				// Once the API is ready, replace the send function to use the API and show the button
				speech.send = function (text) {
					pubsub.send("speak", { text: text }, speakFrame.contentWindow);
				}
				speakFrame.style.borderStyle = "none";
				speakFrame.style.display = null;
			});


			speakFrame.src = "http://speak.l42.eu/";
			speakFrame.style.display = "none";
			speakFrame.setAttribute("style", "display:none;");
			speakFrame.addClass("speakButton");

			return speakFrame;
		}

		return speech;
	})();
	var detect = (function _detect() {
		

		function mediaElement(callback, forceVid) {
			pubsub.waitFor('ready', function() {
				var testVid = document.createElement("video");
				var testAud = document.createElement("audio");
				
				if (typeof testVid.play != 'function') {
					callback(false);
					return;
				}
				
				testVid.setAttribute("style", "visibility: hidden");
				//testVid.src = 'http://ceol.l42.eu/placeholder.mp3';
						   
				// Try playing a really short mp3
				testVid.src = 'data:audio/mpeg;base64,//MUxAAAAANIAUAAAExBTUUzLjk2LjFV//MUxAsAAANIAYAAAFVVVVVVVVVVVVVV';
				document.body.appendChild(testVid);
				
				testAud.setAttribute("style", "visibility: hidden");
				//testAud.src = 'http://ceol.l42.eu/placeholder.mp3';
				testAud.src = 'data:audio/mpeg;base64,//MUxAAAAANIAUAAAExBTUUzLjk2LjFV//MUxAsAAANIAYAAAFVVVVVVVVVVVVVV';
				document.body.appendChild(testAud);
				
				// Do a quick play/pause to check whether the user has to click before playing will work.
				testVid.play();
				var noautoload = testVid.paused;
				testVid.pause();
				
				if (noautoload) {
					var clickprompt = document.createElement("div");
					clickprompt.setAttribute("style", "position: absolute; position: fixed; left: 0; right: 0; top: 0; bottom: 0; margin: 0; background: #24365a; color : white; font-size : 2em; text-align : center; padding : 1em 0; height: 100%;");
					clickprompt.appendChild(document.createTextNode('This device won\'t let me play media automatically for you. You\'re going to have to touch the screen if you want anything to happen.'));
					clickprompt.addEventListener('click', function _useclickformedia() {
						clickprompt.parentNode.removeChild(clickprompt);
						
						// Make sure the playing gets done synchronously following the click for it to be allowed
						_testPlaying();
					}, true);
					document.body.appendChild(clickprompt);
				} else {
					_testPlaying();
				}
				
				function _testPlaying() {
					testAud.play();
					testAud.pause();
					
					// If nothing has happened after 5 seconds, then give up
					var playtimeout = setTimeout(_failure, 5000);
					testVid.addEventListener('playing', _success, false);
					testVid.addEventListener('error', _failure, false);
					testVid.play();
					function _success() {
						var result = false, player=null;
						if (testVid.parentNode) {
							if (testVid.offsetHeight === 0 || forceVid) {
								result = "video";
								player = testVid;
							} else {
								result = "audio";
								player = testAud;
							}
						}
						_cleanupcallback(result, player);
					}
					function _failure() {
						_cleanupcallback(false);
					}
					function _cleanupcallback(returnval, returnplayer) {
						if (playtimeout) clearTimeout(playtimeout);
						testVid.removeEventListener('playing', _success, false);
						testVid.removeEventListener('error', _failure, false);
						if (testVid != returnplayer) testVid.parentNode.removeChild(testVid);
						if (testAud != returnplayer) testAud.parentNode.removeChild(testAud);
						if (returnplayer) {
							returnplayer.pause();
							returnplayer.src = '';
							returnplayer.removeAttribute("style");
						}
						callback(returnval, returnplayer);
						
					}
				}
			});
		};
		
		/**
		 * Returns false if the device is online
		 * Returns true if the device may be online
		 */
		var isOnline = function () {
			
			// If the navigator.onLine isn't a boolean, don't trust it.
			// E.g. nokia n8 returns 0
			if (typeof navigator.onLine != 'boolean') return true;
			return navigator.onLine;
		};
		
		/**
		 * Returns whether the page is in 'lite' mode
		 */
		var isLite = function () {
			return _islite;
		}
		
		var isDev = (function _devMode() {
			var mode, m;
			mode = window.localStorage.getItem('devmode') == 'true' || false;
			function setMode(newMode) {
				if (newMode.toLowerCase() == 'true' || newMode == '1' || newMode === true|| newMode === 1) newMode = true;
				else newMode = false;
				if (mode != newMode) {
					mode = newMode;
					window.localStorage.setItem('devmode', mode);
					pubsub.send('devmodechange');
				}
			}
			if (m = window.location.search.match(/devMode=(true|false|1|0)/i) || window.location.hash.match(/devMode=(true|false|1|0)/i)) {
				setMode(m[1]);
			}
			window.addEventListener('hashchange', function (e) {
				var m;
				if (m = e.newURL.match(/devMode=(true|false|1|0)/i)) {
					setMode(m[1]);
				}
			});
			return function _isDev() {
				return mode;
			}
		})();
		
		return {
			mediaElement: mediaElement,
			isOnline: isOnline,
			isLite: isLite,
			isDev: isDev
		};
	})();
	
	var net = (function _net() {
	
		var currentPolls = new Object();
		function startpoll(url, callback, modifyparams) {
		
			// This url is already being polled, don't start a new one.
			if (currentPolls[url]) return;
			var hashcode = "";
			if (typeof modifyparams != 'function') {
				modifyparams = function _modifyparams(params) {
					return params;
				};
			}
			getpoll(url, callback, modifyparams);
			
			function getpoll(url, callback) {
				currentPolls[url] = true;
				get(url, modifyparams({hashcode: hashcode, "_cb": new Date().getTime()}), function _handlepollresponse(req) {
					if (!currentPolls[url]) return;
					try {
						var newdata = JSON.parse(req.responseText);
					} catch (err) {
						if (typeof console !== 'undefined') console.log("Error parsing json: ", "\""+req.responseText+"\"", err);
						if (!currentPolls[url]) return;
						setTimeout(function _retrypoll() { getpoll(url, callback); }, 5000);
						return;
					}
					if (newdata.hashcode) {
						hashcode = newdata.hashcode;
						if (callback) callback(newdata);
					}
					if (!currentPolls[url]) return;
					getpoll(url, callback);
				}, function _handlepollfailure(req) {	
					if (!currentPolls[url]) return;
					if (typeof console !== 'undefined') {
						if (!req.status) console.log("Server Down", req);
						else console.log("Unknown Poll Response Error", req);
					}
					setTimeout(function _retrypoll() { getpoll(url, callback); }, 5000);
				});
			}
		}
		function stoppoll(url) {
			currentPolls[url] = false;
		}
		function raw(method, url, getparams, postparams, readystatechange, usecredentials, responsetype) {
			if (!getparams) getparams = {};
			var qry = [];
			for(var ii in getparams) qry.push(encodeURIComponent(ii) + "=" + encodeURIComponent(getparams[ii]));
			qry = qry.join("&");
			if (qry) {
				if (url.indexOf("?") == -1) url += "?"+qry;
				else url += "&"+qry;
			}
			// TODO: add in postparams
			try {
				var req = new XMLHttpRequest();
				if (readystatechange) {
					// Ideally use addEventListener, but some browsers don't support it (e.g. Nokia N8 default browser)
					req.onreadystatechange = function _handlestatechange(event) { readystatechange(req, event); };
					// req.addEventListener('readystatechange', function _handlestatechange(event) {readystatechange(req, event);}, false);
				}
				req.open(method, url, true);
				if (usecredentials) req.withCredentials = true;
				if (responsetype) req.responseType = responsetype;
				req.send(null);
			} catch (e) {
				throw "AJAX Error ("+url+") ";
			}
		}
		function checkreadystate(success, error) {
			return function _handlegetresponse(req) {
				if(req.readyState != 4) return;
				if(req.status == 200) {
					if (success) success(req);
				} else {
					if (error) error(req);
				}
			}
		}
		function rawget(url, params, readystatechange, usecredentials) {
			raw("GET", url, params, null, readystatechange, usecredentials);
		}
		function get(url, params, callback, error, usecredentials) {
			raw("GET", url, params, null, checkreadystate(callback, error), usecredentials);
		}
		function post(url, getparams, postparams, callback, error, usecredentials) {
			raw("POST", url, getparams, postparams, checkreadystate(callback, error), usecredentials);
		}
		function getblob(url, callback, error) {
			raw("GET", url, null, null, checkreadystate(function (req) {
				var blob = new Blob([req.response], {type: req.getResponseHeader('content-type')});
				callback(blob);
			}, error), null, "blob");
		}
		return {
			startpoll: startpoll,
			stoppoll: stoppoll,
			rawget: rawget,
			get: get,
			post: post,
			getblob: getblob
		}
	})();
	var render = function _render(template, data) {
		if (typeof window.Mustache == 'undefined') throw "Can't find mustache";
		if (typeof data == "string") data = { message: data };
		if (typeof lucos.bootdata.templates[template] == "string") template = lucos.bootdata.templates[template];
		else throw "Can't find template '"+template+"'";
		
		return window.Mustache.render(template, data);
	};
	var nav = (function _nav() {
		function enable(baseurl, frontcontroller) {
			if (baseurl.charAt(0) != '/') throw "Base URL must not be relative";
			
			// nav_get is a private function.
			var nav_get;
			if (window.history) {
				var current = window.location.pathname;  // Keep track of the current pathname because that is beyond Android's ability
				nav_get = function get() {
					return decodeURIComponent(current);
				}
				nav.isPreload = function () {
					return nav_get() == "/preload";
				};
				if (nav_get().indexOf(baseurl) != 0) return false;
				nav.send = function send(newurl) {
					newurl = baseurl + newurl;
					window.history.pushState(null, null, newurl);
					current = newurl;
					nav.refresh(true);
				}
				nav.replace = function replace(newurl) {
					window.history.replaceState(null, null, baseurl + newurl);
					current = baseurl + newurl;
				}
				window.addEventListener('popstate', function (e) {
					current = window.location.pathname;
					nav.refresh(true);
				}, true);
			} else {
				var ignorenextchange = false;
				var path = window.location.pathname;
				if (path.indexOf(baseurl) == 0 && path != baseurl) window.location.href = path.replace(baseurl, baseurl+'#');
				nav_get = function get() {
					var newurl = window.location.hash.replace('#', '');
					return baseurl + decodeURIComponent(newurl);
				}
				nav.isPreload = function () {
					return nav_get() == "/preload";
				};
				if (nav_get().indexOf(baseurl) != 0) return false;
				nav.send = function send(newurl) {
					window.location.hash = newurl;
					ignorenextchange = newurl;
					nav.refresh(true);
				}
				nav.replace = function replace(newurl) {
					window.location.hash = baseurl + newurl;
					ignorenextchange = baseurl + newurl;
				}
				window.addEventListener('hashchange', function (e) {
					if (ignorenextchange === nav.get()) {
						ignorenextchange = false;
						return;
					} else if (ignorenextchange) {
						ignorenextchange = false;
					}
					nav.refresh(true);
				}, true);
			}
			globallinkhandlers.push(function _handlelocallinks(url) {
				if (!url || url.indexOf(baseurl) != 0) return false;
				nav.send(url.replace(baseurl, ''));
				return true;
			});
			nav.refresh = function (isnewpage) {
				frontcontroller(nav_get());
				if (isnewpage) window.scrollTo(0, 1);
			};
			return true;
		}
		
		// Only return enable for now, other functions get added by enable
		return {
			enable: enable
		}
	})();
	var lucos = {
		listen: pubsub.listen,
		waitFor: pubsub.waitFor,
		send: pubsub.send,
		pubsub: pubsub,
		getTime: getTime,
		speech: speech,
		addNavBar: addNavBar,
		disableNavBar: disableNavBar,
		addMenuItem: addMenuItem,
		detect: detect,
		net: net,
		nav: nav,
		render: render
	};
	
	(function _integrateBootloader() {
		var ii;
		
		// Move bootloader properties into main lucos object if they're not already there
		if (typeof window.lucos_bootloader != 'object') return;
		for (ii in window.lucos_bootloader) {
			if (ii in lucos) continue;
			if (ii == 'lite') {
				_islite = window.lucos_bootloader[ii];
				continue;
			}
			lucos[ii] = window.lucos_bootloader[ii];
		}
	 })();
					   
	// If used as a commonJS module, then assign everything to the exports object
	if (typeof exports == 'object') {
		for (var i in lucos) {
			exports[i] = lucos[i];
		}

	// Otherwise assign lucos to global scope
	} else {
		window.lucos = lucos;
	}
		
})();

