define([
  "jquery",
  "underscore",
  "backbone",
  "js/core/coursera",
  "js/lib/api",
  "js/lib/asyncMessages",
  "js/lib/multitracker"
  ],
function($, _, Backbone, Coursera, API, asyncMessages, MultiTracker) {
  // setup a global API callback handler along with message boxes
  var $message = $("<div>")
    .appendTo("body")
    .addClass("coursera-async-message");

  Coursera.message = asyncMessages.create($message);

  var count = 0;

  Coursera.on("region:fetching", function(region) {
    Coursera.message.add($("<div>loading page</div>")
      .addClass("waiting"), {
      id: region.name + region.uid
    });
  });

  Coursera.on("region:fetched", function(region) {
    Coursera.message.remove(region.name + region.uid);
  });

  Coursera.setup = function(path) {
    Coursera.path   = path;

    if (Coursera.path) {
      Coursera.api = API("/" + Coursera.path + "/api/", {
        message: Coursera.message,
        type: 'rest',
        'csrf.cookie': 'csrf_token',
        'csrf.token': 'X-CSRF-Token',
        'csrf.path': '/' + Coursera.path + '/'
      });

      Coursera.api.on('always', function(api) {
        if (api.xhr.status >= 400) {
          Coursera.tracker.push({
            key: 'api.error.' + api.xhr.status,
            value: {
              timing: api.timing,
              url: api.url,
              status: api.xhr.status,
              response: api.xhr.responseText
            }
          });
        } else {
          Coursera.tracker.push({
            key: 'api.ok.' + api.xhr.status,
            value: {
              timing: api.timing,
              url: api.url,
              status: api.xhr.status
            }
          });
        }
      });
    }
  };

  // need to do this very early on, because models rely on api being ready for them...
  Coursera.setup(location.pathname.match(new RegExp("^/([^\/]*)/.*"))[1]);

  Coursera.multitracker = new MultiTracker(
    {debugMode: Coursera.config.debug});
  
  return Coursera;
});
