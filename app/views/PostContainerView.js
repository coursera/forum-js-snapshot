define([
  "backbone",
  "jquery",
  "underscore",
  "pages/forum/app",
  "pages/forum/models/CommentModel",
  "pages/forum/views/PostContainerView.html",
  "pages/forum/views/PostView",
  "pages/forum/views/CommentView"
  ],
function(Backbone, $, _, Coursera, CommentModel, template, PostView, CommentView) {
  
  var TRACKER_LABEL = 'Forum Post Container';

  var view = Backbone.View.extend({
    template: template,

    events: {
      'click .course-forum-new-comment-link': 'onNewCommentClick'
    },

    initialize: function() {
      this.post = this.model;
      this.post.bind('sync', this.hideCommentsMaybe, this);
      this.comments = this.options.comments;
      this.comments.bind('reset', this.renderComments, this);
      this.comments.bind('add', this.renderComments, this);
    },

    render: function() {
      var self = this;
      self.$el.html(self.template({post: self.post}));
      self.$newCommentContainer = self.$el.find('.course-forum-new-comment-container')

      self.renderPost();
      self.renderComments();
      self.hideCommentsMaybe();
      return self;
    },

    renderPost: function() {
      var self = this;

      self.$el.find('.course-forum-post-top-container').empty();

      var view = new PostView({model: self.post});
      self.$el.find('.course-forum-post-top-container')
          .append(view.render().$el);
    },

    hideCommentsMaybe: function() {
      if (this.post.get('deleted')) {
        this.$('.course-forum-comments-container').hide();
      } else {
        this.$('.course-forum-comments-container').show();
      }
    },

    renderComments: function() {
      var self = this;
      self.$el.find('.course-forum-comments-container').empty();

      self.comments.each(function(comment) {
        view = new CommentView({model: comment});
        self.$el.find('.course-forum-comments-container')
          .append(view.render().$el);
      });
    },

    /* Creates a new comment model and view, but hides it at first.
       When the new comment is saved, then its added to the collection,
       and this function is called again.
     */
    initNewComment: function() {
      this.newComment = new CommentModel({post_id: this.post.get('id'), thread: this.post.get('thread')});
      this.newComment.bind('sync', this.saveNewCommentMaybe, this);
      var view = new CommentView({model: this.newComment});
      this.$newCommentContainer.html(view.render().$el);
    },

    saveNewCommentMaybe: function() {
      var self = this;
      if (!this.newComment.isNew()) {
        this.comments.add(this.newComment);
        this.newComment.unbind('sync', this.saveNewCommentMaybe, this);
        this.newComment = null;
        this.$newCommentContainer.empty();
      }
    },

    onNewCommentClick: function() {
      if (!this.newComment) this.initNewComment();
      this.$newCommentContainer.find('.course-forum-post-edit-container').show();
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Click New Comment');
    }

  });

  return view;
});
