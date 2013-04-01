define([
  'jquery',
  'underscore',
  'backbone',
  "js/lib/api",
  "js/lib/util",
  'pages/forum/app',
  "pages/forum/models/PostModel",
  "pages/forum/models/PostCollection",
  "pages/forum/models/CommentModel",
  "pages/forum/models/CommentCollection",
  "js/lib/backbone.api",
  "js/lib/backbone.relational"

],function($, _, Backbone, API, util, Coursera, PostModel, PostCollection, CommentModel, CommentCollection, BackboneModelAPI) {


  var model = Backbone.RelationalModel.extend({
    url: 'forum/threads',
    subscriptionsUrl: function() {
      return this.url + '/' + this.get('id') + '/subscriptions';
    },
    tagsUrl: function() {
      return this.url + '/' + this.get('id') + '/tags';
    },
    api: Coursera.api,
    partialUpdate: true,
    defaults: {
      '_user_profiles': {},
      'tags': [],
      'sort': 'oldest'
    },
    relations: [{
      type: Backbone.HasMany,
      key: "posts",
      relatedModel: PostModel,
      collectionType: PostCollection,
      reverseRelation: {key: 'thread'},
      includeInJSON: true,
      collectionOptions: {
        comparator: function(post) {
          return post.get('order');
        }
      }
    },
    {
      type: Backbone.HasMany,
      key: "comments",
      relatedModel: CommentModel,
      collectionType: CommentCollection,
      reverseRelation: {key: 'thread'},
      includeInJSON: true
    }],
    initialize: function() {
      this.bind('change', this.updateComputed, this);
      this.set('sort', util.getUrlParam(window.location, 'sort'));
    },
    updateComputed: function() {
      var self = this;
      
      var userIds = [];
      this.get('posts').each(function(post) {
        userIds.push(post.get('user_id'));
      });
      this.get('comments').each(function(comment) {
        userIds.push(comment.get('user_id'));
      });
      this.set('_user_ids', userIds, {silent: true});
      if (userIds.length > 0) {
        this.getUserProfiles();
        this.updateProfilesOnEntries();
      }
    },
    updateRange: function() {
      var first = this.getFirstPost();
      var last = this.getLastPost();
      this.set('start_range', first.get('order'), {silent: true});
      this.set('end_range', last.get('order'));
    },
    getPostsBefore: function(cb){
      var self = this;
      
      // find the first post that is fetched
      var id = self.getFirstPostId();
      
      this.api.get('forum/threads/' + this.get('id'), {data: {
        post_id: id,
        position: 'before',
        sort: this.get('_sort_order')
      }}).done(_.bind(this.onFetchPosts, self, cb));
    },
    getPostsAfter: function(cb) {
      var self = this;
      
      // find the last post that is fetched
      var id = self.getLastPostId();
      
      this.api.get('forum/threads/' + this.get('id'), {data: {
        post_id: id,
        position: 'after',
        sort: this.get('_sort_order')
      }}).done(_.bind(this.onFetchPosts, self, cb));
    },
    onFetchPosts: function(cb, data) {
      if (data){
        this.get('posts').add(data.posts || []);
        this.get('comments').add(data.comments || []);
      }
      this.updateRange();
      if (cb) cb.call(this);
    },
    getSavedPosts: function() {
      var savedPosts =  this.get('posts').filter(function(post){
        return !(post.isNew());
      });
      return savedPosts;
    },
    getFullPosts: function(){
      // returns posts which are not skeletons
      var fullPosts =  this.get('posts').filter(function(post){
        return post.get('post_time');
      });
      return fullPosts;
    },
    getFirstPost: function() {
      return this.getFullPosts().shift();
    },
    getLastPost: function() {
      return this.getFullPosts().pop();
    },
    getFirstPostId: function() {
      return this.getFirstPost().get('id');
    },
    getLastPostId: function() {
      return this.getLastPost().get('id');
    },
    getCommentsForPost: function(post) {
      var self = this;
      var comments = this.get('comments').filter(function(comment) {
        return comment.get('post_id') == post.get('id');
      });
      return new CommentCollection(comments);
    },
    updateProfilesOnEntries: function() {
      var self = this;
      _.each(self.get('_user_profiles'), function(profile) {
        self.get('comments').each(function(entry) {
          if (entry.get('user_id') == profile.id && !entry.get('_user_profile')) {
            entry.set('_user_profile', profile);
          }
        });
        self.get('posts').each(function(entry) {
          if (entry.get('user_id') == profile.id && !entry.get('_user_profile')) {
            entry.set('_user_profile', profile);
          }
        });
      });
    },
    getUserProfiles: function() {
      var self = this;
      
      // only get profiles that we don't know yet
      var newIds = _.filter(self.get('_user_ids'), function(id) {
        return id && !(self.get('_user_profiles')[id]);
      });
      newIds = _.uniq(newIds);
      var api = new API('', {
        type: 'rest',
        'csrf.cookie': 'csrf_token',
        'csrf.token': 'X-CSRF-Token'
      });

      var url = Coursera.config.url.base + Coursera.config.url.api +
        'user/profiles?user-ids=' + newIds.join(',');
      api.get(url, {
        dataType: 'jsonp',
        type: 'get',
        success: function(profiles) {
           _.each(profiles, function(profile) {
            if (!self.get('_user_profiles')[profile.id]) {
              self.get('_user_profiles')[profile.id] = profile;
            }
           });
           self.updateProfilesOnEntries();
      }});
    },
    getURLForSortOrder: function(order){
      var url = window.location.pathname + window.location.search.split('&sort')[0] + '&sort=' + order;
      return url;
    }
  });

  _.extend(model.prototype, BackboneModelAPI);

  return model;

})