# lucos core

Core functionality used by multiple lucos modules

## Deprecated
This library has been deprecated.  Some bits of functionality have been split out into separate libraries:

* [lucos_navbar](https://github.com/lucas42/lucos_navbar) - A web component which handles the navigation bar at the top of lucos pages
* [lucos_pubsub](https://github.com/lucas42/lucos_pubsub) - A fork of the lucos.pubsub logic from lucos_core
* [lucos_time_component](https://github.com/lucas42/lucos_time_component) - Replacement for lucos.getTime and a web component which displays the time in the navbar.

## Background
Bascially, a load of functionality which has been used by several lucos modules has been abstracted out and chucked into a directory.  Don't expect any order or consistency at the moment, this is just a starting point.

## Key files

### bootloader.js
A client side javascript library which loads various resources from the server and stores them in localstorage (if available).
Supports the following types of resources:
* javascript
* css
* mustache templates
* json data
Javascript and CSS will automatically be added to the page/run.
The bootloader supports updates to individual components from the server, without having to download all the other components.

### resources.*
The server-side libraries to server resources in a manner compatible with bootloader.js

### lucos.js
A javascript library which does lots of useful stuff for lucos modules, including:
* Add a standard lucos nav bar to the top of the page
* PubSub (including cross origin via postMessages)
* Wrappers for API provided by other lucos modules client side.
* Detection for html5 media element support (including whether they can start without user interaction)
* AJAX wrapper (including long polling)
* Rendering of mustache templates provided by bootloader.js
* Automatic handling of history state when a module registers a front controller (falls back to url fragments for incompatible browsers)
