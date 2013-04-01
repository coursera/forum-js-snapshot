define([
  'pages/forum/models/EntryModel'
],function(EntryModel) {

  var model = EntryModel.extend({
    textProp: 'comment_text',
    entryType: 'comment',
    url: function() {
      return 'forum/posts/' + this.get('post_id') + '/comments';
    }
  });
  
  return model;
})