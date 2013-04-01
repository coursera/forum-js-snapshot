define([
  'underscore',
  'backbone',
  "pages/forum/app",
  "js/lib/backbone.api",
  'js/lib/backbone.relational',
  'bundles/markdown/Markdown.Converter'
],function(_, Backbone, Coursera, BackboneModelAPI, BackboneRelational, Markdown) {

  var model = Backbone.RelationalModel.extend({
    defaults: {
      _viewer_vote: 0
    },
    api: Coursera.api,
    partialUpdate: true,
    textProp: null,
    entryType: null,
    initialize: function() {
      this.bind('change', this.updateThreadMaybe, this);
    },
    updateThreadMaybe: function() {
      if (this.changedAttributes() && _.contains(_.keys(this.changedAttributes()), '_viewer_subscription') && this.get('thread')) {
        this.get('thread').set('_viewer_subscription', this.get('_viewer_subscription'));
      }
    },
    getPermalinkHash: function() {
      return this.entryType + '-' + this.get('id');
    },
    getPermalink: function(){
      return window.location.href.split('#')[0] + "#" + this.getPermalinkHash();
    },
    votesUrl: function() {
      return this.url() + '/' + this.get('id') + '/votes';
    },
    reportsUrl: function() {
      return this.url() + '/' + this.get('id') + '/reports';
    },
    getMessageHtml: function() {
      var message = this.get(this.textProp);
      if (!message) return '';
      if (this.get('text_type') == 'html') {
        return message;
      } else {
        var converter = new Markdown.Converter();
        return converter.makeHtml(message);
      }
    },
    getEditableHtml: function() {
      return this.getMessageHtml()
        .replace('&lt;', '&amp;lt;').replace('&gt;', '&amp;gt;');
    }
  });

  _.extend(model.prototype, BackboneModelAPI);

  return model;
})