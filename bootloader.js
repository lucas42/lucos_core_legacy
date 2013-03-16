				if (!('JSON' in window)) {
					window.JSON = (function _badJSON() {
						function stringify(item) {
							var output, kk, ii, ll;
							switch (typeof item) {
								case "object":
									output = '{';
									for (kk in item) {
										if (typeof item[kk] == 'undefined') continue;
										if (typeof item == 'undefined') output += '"undefined":';
										else output += stringify(kk) + ': ';
										output += stringify(item[kk]) + ', ';
									}
									output += "}";
									return output.replace(/, }/, '}');
								case "Array":
									output = '[';
									ll = item.length;
									for (ii = 0; ii<ll; ii++) {
										if (typeof item[kk] == 'undefined') output += "null";
										else output += stringify(item[ii]);
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
								case "undefined":
									return item;
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
				(function _bootloader(firstload) {
					var key, resources, version, forcechange, splashScreen, done=false, parsed = {}, loadingmessage = document.createTextNode();
					window.lucos_bootloader = {
						bootdata: {}
					};
					forcechange = window.localStorage.getItem('devmode') && window.localStorage.getItem('devmode') != 'false';
					
					// Set a default message of Loading, gets changed to something more informative later
					updateLoadingMessage('Loading');
				
					function getNewResources(lastversion, callback) {
						var req = new XMLHttpRequest();
						updateLoadingMessage('Retrieving resources');
						
						// Ideally use addEventListener, but some browsers don't support it (e.g. Nokia N8 default browser)
						req.onreadystatechange = function _handlestatechange(event) {
							var data, key;
							if(req.readyState != 4) return;
							if(req.status == 200) {
								try {
									data = JSON.parse(req.responseText);
								} catch (err) {
									if (typeof console !== 'undefined') console.log("Error parsing json: ", "\""+req.responseText+"\"", err);
									return;
								}
								if (!window.lucos_bootloader.lite) {
									try {
										for (key in data) {
											window.localStorage.setItem(key, JSON.stringify(data[key]));
										}
									} catch (e) {
										if (e.code == 22) { // Quota exceeded exception
											console.log("localStorage Quota exceeded.  Clearing and trying again");
											localStorage.clear();
											location.reload();
											return;
										}
										throw e;
									}
									if (!lastversion) {
										
										// If there's no existing resources, then it's safe to parse these ones
										parseResources(data.r);
									} else if (forcechange) {
										if (lastversion != JSON.parse(window.localStorage.getItem('v'))) {
											window.location.reload();
											return;
										}
										// If forcechange is set, resources haven't been parsed yet
										parseResources(resources);
										hideSplashScreen();
									}
								} else {
									
									// If the device has no local storage, parse the resources now
									parseResources(data.r, data);
								}
							} else if(req.status >= 400) {
								throw req.status + "error occured";
							}
							if (typeof window.lucos == "object") {
								window.lucos.send("bootloaderReady");
								if (window != window.parent) {
									window.lucos.send('preload', {result: 'done', section: 'resources'}, window.parent);
								}
								window.lucos.waitFor('manifestready', hideSplashScreen);
							} else {
								hideSplashScreen();
							}
							if (typeof callback == 'function') callback();
						};
						if (!lastversion) lastversion = 0;
						req.open("GET", '/resources?v='+lastversion+'&lite='+(window.lucos_bootloader.lite), true);
						req.send(null);
					}
					function parseResource(key, type, content) {
						if (key && key in parsed) return;
						switch (type) {
							case "css":
								var style = document.createElement("style");
								style.appendChild(document.createTextNode(content));
								document.getElementsByTagName('head')[0].appendChild(style);
								break;
							case "js":
								jsmodules[key] = new Function ("module", "exports", "require", content);
								break;
							case "json":
								window.lucos_bootloader.bootdata[key] = JSON.parse(content);
								break;
							case "mus":
								if (!window.lucos_bootloader.bootdata['templates']) window.lucos_bootloader.bootdata['templates'] = {}
								window.lucos_bootloader.bootdata['templates'][key] = content;
								break;
							default:
								throw "Unknown resource type '"+resources[key]+"'";
						}
						if (key) parsed[key] = true;
				 }
				 var jsmodules = {}, mainjs;
				 function require(moduleid) {
					 var exports = {}, module={id:moduleid};
					 require.main = undefined;
					 if (!(moduleid in jsmodules)) throw "Can't find module '"+moduleid+"'";
					 if (typeof jsmodules[moduleid] == "function") {
						 jsmodules[moduleid](module, exports, require);
						 jsmodules[moduleid] = exports;
					 }
					 return jsmodules[moduleid];
				 }
				 function parseResources(resources, data) {
						var key, content, ii, ll, resource;
						updateLoadingMessage('Parsing resources');
						try {
							if (resources.constructor == Array) {
								for (ii=0, ll=resources.length; ii<ll; ii++) {
									resource=resources[ii];
									key = resource.key;
									if (key in parsed) continue;
									if (typeof data == 'object') content = data[key];
									else content = JSON.parse(window.localStorage.getItem(key));
									if (!content) throw "Can't find content for '"+key+"'";
									parseResource(key, resource.type, content);
								}
							
							// For backwards compatibility, allow an object of key=>type pairs
							// Note that this doesn't guarantee order
							} else {
								for (key in resources) {
									type = resources[key];
									if (typeof data == 'object') content = data[key];
									else content = JSON.parse(window.localStorage.getItem(key));
									if (!content) throw "Can't find content for '"+key+"'";
									parseResource(key, type, content);
								}
							}
				 
							// Decide which javascript module(s) to execute
							if (typeof data == 'object') {
								mainjs = data.mainjs;
							} else {
								mainjs = window.localStorage.getItem('mainjs');
							}
							if (mainjs) {
								require(mainjs);
							} else {

								// If no main module has been specified, then just require all the javascript modules
								for (ii in jsmodules) {
									require(ii);
								}
							}
						} catch (err) {
							if (typeof console !== 'undefined') {
								if (err.toString) {
									console.log(key, err.toString(), err);
								} else {
									console.log(key, err);
								}
							}
						}
					}
					
					var bootstyle = ".splashscreen { position: fixed; left: 0; right: 0; top: 0; bottom: 0; margin: 0; background: #ccf; color : #502; font-size : 2em; text-align : center; padding : 1em 0; font-family: Tahoma, Geneva, sans-serif; } .splashscreen > div { position: absolute; bottom: 50%; width: 100%; } .loadingbar { height: 20px; box-shadow: inset 0 2px 9px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.4); position: relative; background: #502; max-width: 400px; margin: 13px auto -20px auto; border-radius: 15px; }  .loadingbar:after { display: none; }  .loadingbar:after, .loadingbar > span { position: absolute; top: 0; left: 0; bottom: 0; right: 0; background-image: -webkit-gradient(linear, 0 0, 100% 100%, color-stop(.25, rgba(255, 255, 255, .2)), color-stop(.25, transparent), color-stop(.5, transparent), color-stop(.5, rgba(255, 255, 255, .2)), color-stop(.75, rgba(255, 255, 255, .2)), color-stop(.75, transparent), to(transparent) ); background-image: -moz-linear-gradient( -45deg, rgba(255, 255, 255, .2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .2) 50%, rgba(255, 255, 255, .2) 75%, transparent 75%, transparent ); -webkit-background-size: 50px 50px; -moz-background-size: 50px 50px; -webkit-animation: move 2s linear infinite; } @-webkit-keyframes move { 0% { background-position: 0 0; } 100% { background-position: 50px 50px; } } ";
					parseResource(null, 'css', bootstyle);
					function showSplashScreen() {
						var bar, loading;
						if (typeof splashScreen == 'object' || done) return;
						splashScreen = document.createElement("div");
						splashScreen.id = 'splashscreen';
						splashScreen.setAttribute("class", "splashscreen");
						loading = document.createElement("div");
						bar = document.createElement("div");
						bar.setAttribute("class", "loadingbar");
						bar.appendChild(document.createElement("span"));
						loading.appendChild(loadingmessage);
						loading.appendChild(bar);
						splashScreen.appendChild(loading);
						document.body.appendChild(splashScreen);
					}
					function hideSplashScreen() {
						if (done) return;
						done = true;
						
						// remove any references to elements in the splashScreen subtree
						loadingmessage = null;
						if (!splashScreen || !splashScreen.parentNode) return;
						splashScreen.parentNode.removeChild(splashScreen);
					}
					function updateLoadingMessage(message) {
						if (!loadingmessage) return;
						// Weird stuff is happening with unicode, so construct elipsis from char code
						loadingmessage.nodeValue = message+String.fromCharCode(8230);
					}
					window.addEventListener("load", showSplashScreen, false);
					document.addEventListener("DOMContentLoaded", showSplashScreen, false);
					if (typeof window.localStorage == 'undefined') {
						window.lucos_bootloader.lite = true;
						getNewResources(0);
						return;
					}
					window.lucos_bootloader.lite = false;
					try {
						resources = JSON.parse(window.localStorage.getItem('r'));
						version = JSON.parse(window.localStorage.getItem('v'));
						if (!resources) {
							getNewResources(0);
						} else {
							if (!forcechange) {
								parseResources(resources);
								hideSplashScreen();
								if (typeof window.lucos == "object") {
									if (window != window.parent) {
										// Send a message to the parent that we're ready (though not yet done)
										window.lucos.send('preload', {result: 'ready', section: 'resources'}, window.parent);
									}
								}
							}
							getNewResources(version);
						}
					} catch (err) {
						if (typeof console !== 'undefined') {
							if (err.toString) {
								console.log(key, err.toString(), err);
							} else {
								console.log(key, err);
							}
						}
						forcechange = true;
						getNewResources(version);
					}
				 
				 })();
