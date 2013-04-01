define([
  "backbone",
  "jquery",
  "underscore",
  "pages/forum/app",
  "pages/forum/views/UserProfileView.html",
  "pages/forum/views/UserProfileThreadLink.html",
  "pages/forum/views/UserProfileEntryLink.html",
  "pages/forum/views/UserProfileBasics.html"
  ],
function(Backbone, $, _, Coursera,
  UserProfileTemplate, UserProfileThreadLinkTemplate, UserProfileEntryLinkTemplate, UserProfileBasicsTemplate) {

  var view = Backbone.View.extend({
    defaults: {
    },

    events: {
    },

    initialize: function() {
      var self = this;

      this.user = this.model;
      this.user.bind('change', this.renderBasics, this);
      this.user.read();
      this.user.getFullProfile();

      Coursera.api.get(this.model.activitiesUrl())
        .done(function(data) {
          self.renderActivities(data);
        });
      this.render();
    },

    render: function() {
      var self = this;
      if (!self.$('.coursera-profile-basics').length) {
        self.$el.html(UserProfileTemplate());
      }
    },

    renderBasics: function() {
      var self = this;
      self.$('.coursera-profile-basics').html(
        UserProfileBasicsTemplate({config: Coursera.config, user: this.user}));
      if (self.user.get('search_link')) {
        self.$('.course-forum-profile-search a')
          .attr('href', this.user.get('search_link'))
          .show();
      }
    },  

    renderActivities: function(activities) {
      var self = this;
      if (!activities) return;
      if (!activities.threads.length && !activities.posts.length && !activities.comments.length) {
        return;
      }

      var $activities = self.$('.coursera-profile-forum-activities');
      if (activities.totals.threads > 0) {
        $activities.append(UserProfileThreadLinkTemplate(
          {threads: activities.threads,
           total: activities.totals.threads}));
      }
      if (activities.totals.posts > 0) {
        $activities.append(UserProfileEntryLinkTemplate(
          {entries: activities.posts,
           header: 'posts',
           total: activities.totals.posts
         }));
      }
      if (activities.totals.comments > 0) {
        $activities.append(UserProfileEntryLinkTemplate(
          {entries: activities.comments,
           header: 'comments',
           total: activities.totals.comments
          }));
      }
      if (activities.totals.threads > activities.threads.length || 
          activities.totals.posts > activities.posts.length || 
          activities.totals.comments > activities.comments.length
        ) {
        self.$('.course-forum-profile-search').show();
      }
      $activities.show();
    }

  });

  return view;
});
