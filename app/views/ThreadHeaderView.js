define([
  "backbone",
  "jquery",
  "underscore",
  "pages/forum/app",
  "pages/forum/views/ThreadHeaderView.html",
  "pages/forum/views/ThreadTitleEditView.html",
  "js/lib/popups"
  ],
function(Backbone, $, _, Coursera, ThreadHeaderTemplate, ThreadTitleEditTemplate, Popup) {

  var TRACKER_LABEL = 'Forum Thread';
  var THREAD_FIELDS = ['title', 'stickied', 'approved', 'unresolved', 'locked', 'deleted', 'is_spam',
      '_viewer_subscription', '_viewer_can_delete', '_viewer_can_edit_title', '_viewer_can_resolve'];

  var view = Backbone.View.extend({
    defaults: {
    },

    events: {
      'click .course-forum-thread-action-link': 'onThreadActionClick',
      'click .course-forum-thread-controls-toggle .icon-cog': 'onGearClick',
      'click .course-forum-thread-subscribe-link': 'onThreadSubscribeClick',
      'click .course-forum-thread-unsubscribe-link': 'onThreadUnsubscribeClick',
      'click .course-forum-thread-edit-title-link': 'onThreadEditTitleClick',
      'click .course-forum-thread-title button': 'onThreadEditTitleSave',
      'click .course-forum-thread-title a': 'onThreadEditTitleCancel'
    },

    initialize: function() {
      this.thread = this.model;
      this.thread.bind('change', this.render, this);
    },

    render: function() {
      // If we've never rendered or if things have changed that we care about, re-render
      var changedAttrs = this.thread.changedAttributes();
      if (!this.$('.course-forum-thread-controls').length
        || (changedAttrs && _.intersection(_.keys(changedAttrs), THREAD_FIELDS).length > 0)) {
        this.renderViewMode();
      }
      return this;
    },

    renderViewMode: function() {
      this.$el.html(ThreadHeaderTemplate({config: Coursera.config, user: Coursera.user, thread: this.thread}));
      this.$title = this.$('.course-forum-thread-title');
    },

    onGearClick: function(e) {
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Controls Open');
    },

    onThreadActionClick: function(e) {
      var self = this;
      var $link = $(e.target);
      var property = $link.attr('data-property');
      var value    = $link.attr('data-value');
      var props = {};
      props[property] = value;
      this.thread.update(props,
        {message: {waiting: 'Processing...', success: 'Processed!'}}
        )
        .done(function(data) {
          self.thread.set(data);
        });
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Action ' + property + ' ' + value);
    },

    onThreadEditTitleClick: function(e) {
      var self = this;
      var titleHeight = self.$title.height();
      self.$title.html(ThreadTitleEditTemplate({user: Coursera.user, thread: this.thread}));
      self.$title.find('form').height(titleHeight).focus();
      self.$title.find('input').focus();
      self.$title.find('.course-forum-thread-title button').attr('disabled', null);
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Title Edit Start');
    },

    onThreadEditTitleSave: function(e) {
      e.preventDefault();
      var self = this;
      self.thread.update(
        {title: self.$('input').val()},
        {message: {waiting: 'Saving title...', success: 'Saved title!'}}
        )
        .done(function(data) {
          self.thread.set(data);
      });
      self.$title.find('.course-forum-thread-title button').attr('disabled', 'disabled');
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Title Edit Save');
    },

    onThreadEditTitleCancel: function(e) {
      e.preventDefault();
      this.renderViewMode();
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Title Edit Cancel');
    },

    onThreadSubscribeClick: function(e) {
      var self = this;
      Coursera.api.post(
        this.model.subscriptionsUrl(),
        {message: {waiting: 'Subscribing...', success: 'Subscribed!'}}
        )
        .done(function(data) {
          self.thread.set({'_viewer_subscription': data});
        });
    },
    onThreadUnsubscribeClick: function(e) {
      var self = this;
      Coursera.api['delete'](
        this.model.subscriptionsUrl(),
        {message: {waiting: 'Unsubscribing...', success: 'Unsubscribed!'}}
        )
        .done(function(data) {
          self.thread.set({'_viewer_subscription': data});
        });
    }

  });
  return view;
});