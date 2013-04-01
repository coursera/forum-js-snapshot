define([
  "backbone",
  "jquery",
  "underscore",
  "pages/forum/app",
  "pages/forum/views/ThreadTagsView.html",
  "js/lib/select2"
  ],
function(Backbone, $, _, Coursera, ThreadTagsTemplate) {

  var TRACKER_LABEL = 'Forum Thread';

  var view = Backbone.View.extend({
    defaults: {
    },

    events: {
      'click .course-forum-thread-tags-link': 'onThreadTagsClick',
      'click .course-forum-thread-tags-form button': 'onThreadTagsSave',
      'click .course-forum-thread-tags-form a': 'onThreadTagsCancel',
      'click .course-forum-thread-tag-delete': 'onThreadTagDelete'
    },

    initialize: function() {
      this.thread = this.model;
      this.thread.bind('change', this.render, this);
    },

    render: function() {
      // If we've never rendered or if things have changed that we care about, re-render
      var changedAttrs = this.thread.changedAttributes();
      if (!this.$('.course-forum-thread-tags-form').length
        || (changedAttrs && _.intersection(_.keys(changedAttrs), ['tags']).length > 0)) {
        this.$el.html(ThreadTagsTemplate({config: Coursera.config, thread: this.thread}));
        this.$form = this.$('.course-forum-thread-tags-form');
      }
      return this;
    },

    onThreadTagsClick: function(e) {
      e.preventDefault();
      var self = this;
      self.$form.show();
      Coursera.api.get('forum/tags', {message: {waiting: 'Fetching tags...'}})
        .done(function(data) {
          var currentTags = _.pluck(self.thread.get('tags'), 'tag_name');
          var allTags = _.pluck(data, 'tag_name');
          var possibleTags = _.without(allTags, currentTags);
          self.$form.find('input').select2({
                  width: '400px', tags: possibleTags
                });
          self.$form.find('button').attr('disabled', null);
        });
    },

    onThreadTagsSave: function(e) {
      e.preventDefault();
      var self = this;
      var tagNames = self.$('input[name=tags]').val().split(',');
      var tags =  _.map(_.uniq(tagNames),
        function(tagName) {return {'tag_name': tagName}});

      Coursera.api.post(this.thread.tagsUrl(),
        {data: tags,
         message: {waiting: 'Saving tags...', success: 'Saved tags!'}
        })
        .done(function(data) {
          self.thread.set({'tags': data});
        });
      self.$form.find('button').attr('disabled', 'disabled');
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Tags Save');
    },

    onThreadTagsCancel: function(e) {
      var self = this;
      e.preventDefault();
      self.$form[0].reset();
      self.$form.hide();
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Tags Cancel');
    },

    onThreadTagDelete: function(e) {
      e.preventDefault();
      var self = this;
      var tags = [{tag_name: $(e.target).attr('data-tag')}]
      Coursera.api['delete'](this.thread.tagsUrl(),
        {data: tags,
        message: {waiting: 'Deleting tag...', success: 'Deleted tag'}
        })
        .done(function(data) {
          self.thread.set({'tags': data});
        });
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Tag Delete');
    }

  });
  return view;
});