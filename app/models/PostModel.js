define([
  'pages/forum/models/EntryModel'

],function(EntryModel){

  return EntryModel.extend({
    defaults: {
        order: 9999999999
    },
    textProp: 'post_text',
    entryType: 'post',
    url: function() {
      return 'forum/threads/' + this.get('thread_id') + '/posts';
    }
  });
})