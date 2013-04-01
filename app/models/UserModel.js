define([
  'underscore',
  'backbone',
  "pages/forum/app",
  "js/lib/api",
  "js/lib/backbone.api"
],function(_, Backbone, Coursera, API, BackboneModelAPI) {

  var model = Backbone.Model.extend({
    api: Coursera.api,
    url: 'user/information',
    activitiesUrl: function() {
      return this.url + '/' + this.get('id') + '/activities';
    },
    canModerateForum: function() {
      return this.get('forum_moderate') == 1;
    },
    canAccessAdmin: function() {
      return this.get('admin_access') == 1;
    },
    displayName: function() {
      return this.get('display_name') || this.get('full_name');
    },
    fullProfileUrl: function() {
      if (this.get('external_id')) {
        return Coursera.config.url.base + 'user/i/' + this.get('external_id');
      } else {
        return null;
      }
    },
    getFullProfile: function() {
      var self = this;
      var api = new API('');
      var url = Coursera.config.url.base + Coursera.config.url.api +
        'user/profiles?user-ids=' + this.get('id');
      api.get(url, {
        dataType: 'jsonp',
        type: 'get',
        success: function(profiles) {
          if (profiles.length) {
            self.set(profiles[0]);
          }
        }
      });
    }
  });

  _.extend(model.prototype, BackboneModelAPI);

  return model;
})