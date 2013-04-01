define([
  "backbone",
  "jquery",
  "underscore",
  "pages/forum/app",
  'pages/forum/models/ForumCollection',
  "pages/forum/views/ThreadNewView.html",
  "pages/forum/views/EditorUtil",
  "pages/forum/models/ThreadModel",
  "js/lib/select2"
  ],
function(Backbone, $, _, Coursera,
  ForumCollection, ThreadNewTemplate, EditorUtil, ThreadModel) {

  var TRACKER_LABEL = 'Forum Thread New';
  var TAG_TECHNICAL = 'BugInPlatform';
  var TAG_MATERIALS = 'BugInCourseMaterial';
  var FORUM_TECHNICAL = 'technical';
  var FORUM_MATERIALS = 'course material';

  var view = Backbone.View.extend({
    defaults: {
    },

    events: {
      'submit .course-forum-thread-new-form': 'onThreadSave',
      'change input[name=is_bug_report]': 'onBugChange',
      'change input[name=is_coursera_bug_report]': 'onBugTypeChange',
      'change input[name=is_course_material_report]': 'onBugTypeChange',
      'blur input[name=title]': 'onTitleChange'
    },

    initialize: function() {
      this.thread = this.model;
      this.render();
    },

    render: function() {
      var self = this;

      self.$el.html(ThreadNewTemplate({config: Coursera.config, thread: self.thread}));

      self.$form = self.$('.course-forum-thread-new-form');
      self.$bugCheckbox = self.$('input[name="is_bug_report"]');
      self.$techCheckbox = self.$('input[name="is_coursera_bug_report"]');
      self.$materialsCheckbox = self.$('input[name="is_course_material_report"]');
      self.bugFields = [self.$techCheckbox, self.$materialsCheckbox];
      self.$tagsInput = self.$('input[name="tags"]');
      self.$titleInput = self.$('input[name=title]');
      self.$forumsDropdown = self.$('.course-forum-thread-new-subforums');

      EditorUtil.makeEditor(self.$form);

      Coursera.api.get('forum/forums')
        .done(function(data) {
          var forums = _.sortBy(data, function(datum) {
            return datum.name;
          });
          var forumCollection = new ForumCollection(forums);
          forumCollection.each(function(forum){
            var $option = $('<option>');
            $option.attr('value', forum.id);
            $option.text(forum.getFullName());
            if (forum.id == self.thread.get('forum_id')) {
              $option.attr('selected', 'selected');
              self.forum = forum;
            }
            self.$forumsDropdown.append($option);
          });
          self.forums = forums;
          self.setupBugFields();
        });

      Coursera.api.get('forum/tags')
        .done(function(data) {
          var tags = _.map(data, function(datum) {
            return datum.tag_name
          });
          self.$tagsInput.select2({tags: tags});
        });

    },

    setupBugFields: function() {
      var self = this;
      if (!self.forum) return;

      // Automatically check boxes based on forum name
      var inTechForum = self.forum.get('name').toLowerCase().indexOf(FORUM_TECHNICAL) > -1;
      var inMaterialsForum = self.forum.get('name').toLowerCase().indexOf(FORUM_MATERIALS) > -1;
      if (inTechForum || inMaterialsForum) {
        self.$bugCheckbox.attr('checked', 'checked');
      }
      if (inTechForum) {
        self.$techCheckbox.attr('checked', 'checked');
      }
      if (inMaterialsForum) {
        self.$materialsCheckbox.attr('checked', 'checked');
      }
      self.onBugChange();
      self.onBugTypeChange();
    },

    // Toggle fields and add tags as appropriate
    onBugChange: function() {
      var self = this;
      if (self.$bugCheckbox.is(':checked')) {
        $.each(self.bugFields, function(ind, $field) {
            $field.parents('.control-group').show();
        });

        var $textArea = self.$('textarea[name=text]');
        if ($textArea.val() === '') {
          var template = 'The problem summary:<br><br>Steps to reproduce:<ol><li></li></ol><br>Screenshot:<br><br>';
          $textArea.val(template).trigger('change');
        }
      } else {
        $.each(self.bugFields, function(ind, $field) {
            $field.parents('.control-group').hide();
        });
      }
    },

    onBugTypeChange: function() {
      var self = this;

      // Automatically add tags based on checkboxes
      // Automatically select forum based off of checking
      var currentTags = [];
      // Trim and split on spaces
      if (self.$tagsInput.val() !== '') {
        currentTags = self.$tagsInput.val().split(',');
      }

      if (self.$techCheckbox.is(':checked')) {
        currentTags.push(TAG_TECHNICAL);
        self.$forumsDropdown.find('option').each(function() {
          if ($(this).text().toLowerCase().indexOf(FORUM_TECHNICAL) > -1) {
            $(this).attr('selected', 'selected');
          }
        });
      } else {
        currentTags = _.without(currentTags, TAG_TECHNICAL);
      }
      if (self.$materialsCheckbox.is(':checked')) {
        currentTags.push(TAG_MATERIALS);
        self.$forumsDropdown.find('option').each(function() {
          if ($(this).text().toLowerCase().indexOf(FORUM_MATERIALS) > -1) {
            $(this).attr('selected', 'selected');
          }
        });
      } else {
        currentTags = _.without(currentTags, TAG_MATERIALS);
      }
      self.$tagsInput.val(_.uniq(currentTags));
      self.$tagsInput.select2('val', _.uniq(currentTags));
    },

    onTitleChange: function() {
      var self = this;

      self.$titleInput.blur(function() {
        var searchText = self.$titleInput.val();
        if (!searchText) return;
        var searchUrl = 'search?autocomplete=json&forum_id=' + self.thread.get('forum_id') + "&q=" + encodeURI(searchText);
        $.get(searchUrl, null, function(data) {
            if(data.length > 5) {
                self.$('.course-forum-new-suggestions-list').html(data);
                self.$('.course-forum-new-suggestions').show('slow');
            }
        }, 'html');
      });
    },

    onThreadSave: function(e) {
      e.preventDefault();
      var self = this;

      self.$form.find('button').attr('disabled', 'disabled');

      var props = EditorUtil.getPropsFromForm(self.$form);
      props.tags = _.map(props.tags.split(','),
        function(tagName) { return {'tag_name': tagName}});

      function renderError(msg) {
        self.$('.course-forum-thread-new-error').closest('.control-group').addClass('error');
        self.$('.course-forum-thread-new-error').html('Error: ' + msg);
        self.$form.find('button').attr('disabled', null);
      }

      self.thread.update(props,
        {message: {waiting: 'Creating thread...', success: 'Created thread!'}}
        )
        .done(function(data) {
          if (data.id) {
            var baseUrl = window.location.pathname.substr(0, window.location.pathname.lastIndexOf('/')+1);
            window.location.href = baseUrl + 'thread?thread_id=' + data.id;
          } else {
            renderError('Could not create thread.');
          }
        })
        .fail(function(xhr) {
          renderError(xhr.responseText);
        })
    }

  });

  return view;
});