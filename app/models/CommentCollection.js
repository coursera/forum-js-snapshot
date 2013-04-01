define([
  'backbone',
  "pages/forum/models/CommentModel"

], function(Backbone, CommentModel){

  var CommentCollection = Backbone.Collection.extend({
    model: CommentModel
  });
  return CommentCollection;
 
});
