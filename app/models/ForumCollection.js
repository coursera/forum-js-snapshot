define([
  'backbone',
  "pages/forum/models/ForumModel"

], function(Backbone, ForumModel){

  var ForumCollection = Backbone.Collection.extend({
    model: ForumModel,
    comparator: function(forum) {
      return forum.getFullName();
    }
  });
  return ForumCollection;
  
});
