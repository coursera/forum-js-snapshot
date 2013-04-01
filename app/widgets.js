define([
  "jquery",
  "underscore",
  "backbone",
  'js/lib/util',
  'pages/forum/app',
  'pages/forum/models/UserModel',
  'pages/forum/models/ThreadModel',
  'pages/forum/views/ThreadView',
  'pages/forum/views/ThreadNewView',
  'pages/forum/views/UserProfileView'
],
function($, _, Backbone, util, Coursera, UserModel, ThreadModel, ThreadView, ThreadNewView, UserProfileView) {
  
  $(document).ready(function() {

    var user = new UserModel({id: 'current'});
    user.read()
      .done(function() {
      Coursera.user = user;

      $('[data-forum-thread]').each(function() {
        var threadId = Number($(this).attr('data-thread-id'));
        var threadMode = $(this).attr('data-thread-mode');
        var hash = window.location.hash.replace('#','').split('-');
        var opt = {};
        opt[hash[0]] = hash[1];
        
        var sort = util.getUrlParam(window.location.href, 'sort');
        var thread = new ThreadModel({id: threadId, _sort_order: sort});
        new ThreadView(_.extend(opt, {
          el: $(this)[0], 
          model: thread,
          mode: threadMode
        }));

      });
      
      $('[data-forum-thread-new]').each(function() {
        var thread = new ThreadModel({forum_id: $(this).attr('data-forum-id')});
        new ThreadNewView({
          el: $(this)[0],
          model: thread
        });
      });

      $('[data-user-profile]').each(function() {
        new UserProfileView({
          el: $(this)[0],
          model: new UserModel({id: $(this).attr('data-user-id')})
        });
      });

      util.setupPromos();

    });

  });

});
