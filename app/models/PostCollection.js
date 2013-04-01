define([
  'backbone',
  "pages/forum/models/PostModel"

], function(Backbone, PostModel){

  var PostCollection = Backbone.Collection.extend({
    model: PostModel
  });
  return PostCollection;
  
});
