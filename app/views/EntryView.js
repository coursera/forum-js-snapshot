define([
  "backbone",
  "jquery",
  "underscore",
  "js/lib/moment",
  "js/lib/util",
  "pages/forum/app",
  "pages/forum/views/EntryView.html",
  "pages/forum/views/EntryBylineView.html",
  "pages/forum/views/EntryEditView.html",
  "pages/forum/views/EntryReportView.html",
  "pages/forum/views/EditorUtil",
  "js/lib/popups",
  "js/lib/modals",
  "js/lib/coursera.mathjax"
  ],
function(Backbone, $, _, moment, util, Coursera, template, bylineTemplate, editTemplate, reportTemplate, EditorUtil, Popup, Modal, mathjax) {
  
  var TRACKER_LABEL = 'Forum Entry';

  var view = Backbone.View.extend({
    template: template,

    events: {
      'click .course-forum-post-admin-details-link': 'onAdminDetailsClick',
      'click .course-forum-post-action-link': 'onEntryActionClick',
      'click .course-forum-post-edit-link': 'onEntryEditClick',
      'click .course-forum-post-controls-toggle': 'onGearClick',
      'click .course-forum-post-edit-form button.course-forum-post-edit-save': 'onEntryEditSave',
      'click a.course-forum-post-vote-button': 'onVoteClick',
      'click a.course-forum-post-edit-cancel': 'onEntryEditCancel',
      'click .course-forum-post-controls-report': 'onReportClick',
      'click .course-forum-report-modal button': 'onReportSave'
    },

    initialize: function() {
      this.model.bind('sync', this.render, this);
      this.model.bind('change', this.renderBylineMaybe, this);
      this.model.bind('error', this.renderError, this);
    },

    render: function(e) {
      var self = this;
      self.renderEntry();
      if (self.model.isNew()) {
        self.renderEditMode();
      } else {
        mathjax.render(self.el);  
      }
      return self;
    },

    renderEntry: function(e) {
      var self = this;
      self.$el.html(self.template({entry: this.model, user: Coursera.user}));
      self.renderByline();
      self.$viewContainer = self.$('.course-forum-post-view-container');
      var changedAttrs = this.model.changedAttributes();
      if (changedAttrs) {
        if (changedAttrs[this.model.textProp]) {
          self.$('.course-forum-post-text').animate({
            "margin-left": "-=5"
          }, 100)
            .animate({
            "margin-left": "+=5"
          }, 100);
        } else if (changedAttrs['votes']) {
          self.$('.course-forum-post-vote-controls').animate({
            "margin-left": "-=5"
          }, 100)
            .animate({
            "margin-left": "+=5"
          }, 100);
        }
      }
      
      if(!self.model.get('_viewer_can_vote')){
        self.$('.course-forum-post-vote-button').addClass('course-forum-post-vote-disabled');
      }

      return self;
    },

    renderByline: function() {
      this.$('.course-forum-post-byline').html(bylineTemplate({entry: this.model, user: Coursera.user}));
      this.renderTime();
    },

    renderBylineMaybe: function(e) {
      var changedAttrs = this.model.changedAttributes();
      if (changedAttrs && changedAttrs['_user_profile']) {
        this.renderByline();
      }
    },

    renderError: function(e, xhr) {
      this.$('.course-forum-entry-error').remove();
      var $errorDiv = $('<div>');
      $errorDiv.append(xhr.responseText).addClass('alert alert-error course-forum-entry-error');
      this.$el.append($errorDiv);
    },

    renderTime: function() {
      var self = this;
      var $postTime = self.$('.course-forum-post-byline time');
      var postTime = moment.unix($postTime.attr('datetime'));

      // To avoid problems with clock being out of sync
      // See https://github.com/timrwood/moment/issues/537
      if (Math.abs(moment().diff(postTime)) < (60 * 1000)) {
        $postTime.text('just now');
      } else {
        $postTime.text(postTime.fromNow());
      }
      $postTime.attr('title', postTime.format("dddd, MMMM Do YYYY, h:mm a Z"));
    },

    onGearClick: function(e) {
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Controls Open');
    },

    onAdminDetailsClick: function() {
      this.$('.course-forum-post-admin-container').show();
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Admin Details');
    },

    onEntryEditCancel: function() {
      this.$editContainer.hide();
      if (!this.model.isNew()) {
        this.$viewContainer.show();
      }
    },

    onEntryEditClick: function() {
      var self = this;
      self.renderEditMode();
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Edit');
    },

    renderEditMode: function() {
      var self = this;
      // if its not made yet or not in the dom
      if (!self.$editContainer || (self.$editContainer && !self.$editContainer.parent().length)) {
        self.$el.append(editTemplate({entry: this.model}));
        self.$editContainer = self.$('.course-forum-post-edit-container');
        self.$viewContainer.hide();
        self.$editContainer.show();

        var editor = EditorUtil.makeEditor(self.$editContainer.find('form'));

        // We want to focus in the case of comments, because they are always
        // shown in response to an explicit user action.
        // We dont focus for new posts because they are always there.
        if (self.model.entryType == 'comment') {
          editor.on("load", function() {
            if (editor.composer) editor.composer.element.focus();
          });
        }
      }

      self.$editContainer.find('.course-forum-post-edit-save').removeAttr('disabled'); 
    },

    onEntryEditSave: function(e) {
      var self = this;
      e.preventDefault();

      var props = EditorUtil.getPropsFromForm(self.$editContainer.find('form'));
      self.model.update(props, {message: {waiting: 'Saving...', success: 'Saved!'}});
      self.$editContainer.find('.course-forum-post-edit-save').attr('disabled', 'disabled');
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Edit Save');  
      return false;
    },

    onEntryActionClick: function(e) {
      var self = this;
      var $link = $(e.target);
      var property = $link.attr('data-property');
      var value    = $link.attr('data-value');
      var props = {};
      props[property] = value;
      this.model.update(props, {message: {waiting: 'Processing...', success: 'Processed!'}});
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Action ' + property + ' ' + value);
    },

    onVoteClick: function(e) {
      var self = this;
      e.preventDefault();
      e.stopPropagation();
      var $button = $(e.target).parent('a');
      if($button.hasClass('course-forum-post-vote-disabled')) {
        return;
      }
      var voteAction = $button.attr('data-direction-value');
      Coursera.api.post(this.model.votesUrl(),
        {data: {direction: voteAction},
         message: {waiting: 'Recording vote...', success: 'Recorded vote!'}
        })
        .done(function(data) {
          self.model.set(data);
          self.renderEntry();
        });

      return false;
    },

    onReportClick: function(e) {
      var self = this;
      self.$el.append(reportTemplate());
      var modal = new Modal(self.$('.course-forum-report-modal'));
      modal.open();
      self.$('.course-forum-report-modal textarea').focus();
    },

    onReportSave: function(e) {
      var self = this;
      var description = self.$('.course-forum-report-modal textarea').val();
      Coursera.api.post(this.model.reportsUrl(),
        {data: {description: description},
        message: {waiting: 'Sending report...', success: 'Sent!'}
        })
        .done(function() {});
    }

  });

  return view;
});
