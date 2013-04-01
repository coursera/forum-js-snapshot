define([
  'backbone'
], function(Backbone){

  return Backbone.Model.extend({
    getParent: function() {
      return this.collection.get(this.get('parent_id'));
    },
    getFullName: function() {
      var parent = this.getParent();
      var name = this.get('name');
      if (!parent || parent.get('parent_id') == -1) {
        return name;
      } else {
        return parent.getFullName() + ' > ' + name;
      }
    }
  });
})