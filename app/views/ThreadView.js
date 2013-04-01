define([
  "backbone",
  "jquery",
  "underscore",
  "js/lib/util",
  "pages/forum/app",
  "pages/forum/views/ThreadView.html",
  "pages/forum/views/ThreadSortView.html",
  "pages/forum/views/ThreadCrumbsView.html",
  "pages/forum/views/ThreadHeaderView",
  "pages/forum/views/ThreadTagsView",
  "pages/forum/views/PostContainerView",
  "pages/forum/models/ThreadModel",
  "pages/forum/models/PostModel"
  ],
function(Backbone, $, _, util, Coursera, 
  ThreadTemplate, ThreadSortTemplate, ThreadCrumbsTemplate,
  ThreadHeaderView, ThreadTagsView, PostContainerView,
  ThreadModel, PostModel) {

  var getPostsBefore = _.throttle(function(ctx){
    ctx.model.getPostsBefore();
  }, 1500);

  var getPostsAfter = _.throttle(function(ctx){
    ctx.model.getPostsAfter();
  }, 1500);

  var scrollToEl = function($el) {
    if ($el.position()) $('html,body').scrollTop($el.position().top);
  }

  var order;

  var TRACKER_LABEL = 'Forum Thread';

  var view = Backbone.View.extend({
    defaults: {
    },

    events: {
      'click .course-forum-thread-admin-details-link': 'onAdminDetailsClick'    
    },

    initialize: function() {
      this.thread = this.model;

      this.thread.bind('change', this.render, this);
      this.thread.bind('error', this.renderError, this);
      
      this.thread.read({
        data: {
          post_id: this.options.post,
          comment_id: this.options.comment,
          sort: this.thread.get('sort')
        },
        message: {
          waiting: 'Fetching thread information...'
        }
        }, _.bind(this.thread.onFetchPosts, this.thread, null));
    
      this.postContainers = {};
      $(window).on("scroll", _.bind(this.onScroll, this));
    },

    renderError: function(e, xhr) {
      this.$('.course-forum-thread-error').remove();
      var $errorDiv = $('<div>');
      $errorDiv.append(xhr.responseText).addClass('alert alert-error course-forum-thread-error');
      this.$el.append($errorDiv);
    },

    updatePageMeta: function() {
      // We will only set these if we're in page mode
      if (this.options.mode != 'page') return;
      document.title = this.thread.get('title');

      util.setMetaTag('property', 'og:title', this.thread.get('title'));
      util.setMetaTag('property', 'og:url', this.thread.get('link'));
    },

    render: function() {
      var self = this;
      
      var changedAttrs = self.thread.changedAttributes();

      self.updatePageMeta();

      if (!self.$('.course-forum-thread-posts-container').length) {
        // do this on first render
        self.$el.html(ThreadTemplate({config: Coursera.config, thread: self.thread}));
        self.$('.course-forum-thread-crumbs').html(ThreadCrumbsTemplate({_:_, thread: this.thread}));
        self.$('.course-forum-thread-tags').html(new ThreadTagsView({model: this.thread}).render().el);
        self.$('.course-forum-thread-header-wrapper').html(new ThreadHeaderView({model: this.thread}).render().el);
      }

      // Render sort controls and posts on first render and if those change
      if (self.$('.course-forum-thread-posts-container').is(':empty') || 
        (changedAttrs && _.intersection(_.keys(changedAttrs), ['locked', 'start_range', 'end_range', 'num_posts']).length > 0)) {
        self.$('.course-forum-thread-sort').html(ThreadSortTemplate({user: Coursera.user, thread: this.thread}));
        var activeSortButton = null;
        self.$('.course-forum-thread-sort ul li').each(function(index, el) {
          var $el = self.$(el);
          if ($el.attr('data-sort-name') === self.thread.get('sort')) {
            $el.addClass('active');
            activeSortButton = $el;
          }
        });
        if (!activeSortButton) {
          self.$('.course-forum-thread-sort ul li').eq(1).addClass('active');
        }
        self.renderPosts();
        self.scrollToPermalinkMaybe();
      }
      if (self.thread.get('deleted') == 1) {
        self.$el.addClass('course-forum-thread-deleted');
      } else {
        self.$el.removeClass('course-forum-thread-deleted');
      }
      if (self.thread.get('locked') == 1) {
        self.$('.course-forum-thread-new-post').hide();
        self.$('.course-forum-new-comment-link-container').hide();
      } else {
        self.$('.course-forum-thread-new-post').show();
        self.$('.course-forum-new-comment-link-container').show();
      }
      return self;
    },

    saveNewPostMaybe: function() {
      var self = this;
      if (!this.newPost.isNew()) {
        this.model.get('posts').add(this.newPost);
        this.initNewPost();
        self.renderPosts();
      }
    },

    scrollToPermalinkMaybe: function(){
      var self = this;
      if(!self.hasScrolled){
        self.hasScrolled = true;

        var post = this.options.post;
        var comment = this.options.comment;
        var $el;
        if (post) {
          $el = self.$('[data-permalink="post-' + post + '"]');
        } else if (comment) {        
          $el = self.$('[data-permalink="comment-' + comment + '"]');
        }
        if ($el) {
          $el.addClass('course-forum-permalink');

          scrollToEl($el);
          self.thread.getPostsBefore(function() {
            scrollToEl($el);
          });
        }
      }
    },

    initNewPost: function() {
      var self = this;

      if (this.newPost){
        this.newPost.unbind('sync', this.saveNewPostMaybe, this);
      }
      this.newPost = new PostModel({thread_id: this.thread.get('id'), thread: this.thread});
      this.newPost.bind('sync', this.saveNewPostMaybe, this);
      var view = new PostContainerView({
        model: this.newPost,
        comments: this.thread.getCommentsForPost(this.newPost)
      });
      self.$el.find('.course-forum-thread-new-post').html(view.render().$el);
    },

    renderPosts: function() {
      var self = this;

      var previousPost = null;
      self.model.get('posts').each(function(post, index) {

        // If we haven't made a PostContainer for this post yet and its not empty,
        // then we create a view for it and its comments
        if (!_.has(self.postContainers, post.get('id')) && post.get('post_text')) {
          var view = new PostContainerView({model:post, thread: self.thread, comments: self.thread.getCommentsForPost(post)});
          // Here, we figure out where to append the post, by looking for the closest post
          // that comes after it or the closest post that comes before it.
          // If we find neither of those, we just append to the container (it must be the first).
          var nearestNextPost = self.thread.get('posts').find(function(otherPost) {
            return (otherPost.get('order') > post.get('order')) && self.postContainers[otherPost.get('id')];
          });

          var nearestPrevPost = _.find(self.thread.get('posts').toArray().reverse(), function(otherPost) {
            return (otherPost.get('order') < post.get('order')) && self.postContainers[otherPost.get('id')];
          });
          if (nearestNextPost) {
            var nextPostContainer = self.postContainers[nearestNextPost.get('id')];
            nextPostContainer.$el.before(view.render().$el);
          } else if (nearestPrevPost) {
            var prevPostContainer = self.postContainers[nearestPrevPost.get('id')];
            prevPostContainer.$el.after(view.render().$el);
          } else {
            self.$el.find('.course-forum-thread-posts-container')
              .append(view.render().$el);
          }
          self.postContainers[post.get('id')] = view;
        }
      });
      // If we've seen the final post, then hide the bottom indicator and let them make a new post
      if (self.thread.get('end_range') === self.thread.get('posts').length) {
        self.hideBottomScrollIndicator();
        self.initNewPost();
      } 
      // If we've seen the first post, then hide the top indicator
      if (self.thread.get('start_range') === 1) {
        self.$el.find('.course-forum-top-scroll-indicator').hide();
      }
      
    },

    hideBottomScrollIndicator: function(){
      this.$el.find('.course-forum-bottom-scroll-indicator').hide();
      this.$el.find('.course-forum-thread-new-post');
    },

    onScroll: function(){
      var self = this;

      // We remember that the user scrolled so that elsewhere, we can decide
      // not to try and scroll them to the permalink
      self.hasScrolled = true;
      var $el = $(window);
      var buffer = 400;

      if($el.scrollTop() + $el.height() + buffer > $(document).height()){
       getPostsAfter(self);
      }

      if($el.scrollTop() < 100){
        getPostsBefore(self);
      }

    },

    onAdminDetailsClick: function() {
      this.$('.course-forum-post-admin-container').show();
      Coursera.multitracker.pushEvent(TRACKER_LABEL, 'Admin Details');
    }

  });

  return view;
});
