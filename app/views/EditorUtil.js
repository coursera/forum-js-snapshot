define([
  "backbone",
  "jquery",
  "underscore",
  "pages/forum/app",
  "js/lib/coursera.wysihtml5",
  "js/lib/util",
  "js/lib/cookie"
  ],
function(Backbone, $, _, Coursera, wysihtml5, util, cookie) {

  // We use wysi editor on desktop devices but not on iPad due to
  // many usability reports with inability to type, freezing, etc.
  function makeEditor($form) {

    var showToolbar = true;

    // Can be html (wysi), textarea (html editing), or markdown
    var defaultComposer = cookie.get('course.forum.composer.default') || 'html';
    if (util.isIOS()) {
      defaultComposer = 'markdown';
    }
    
    var editor = wysihtml5($form.find('textarea'),
        {
        'toolbar.image': true,
        'toolbar.latex': true,
        'toolbar.code': true,
        'composer.default': defaultComposer,
        'composer.stylesheet': [
          Coursera.config.url.app_assets + 'css/spark.main.css',
          Coursera.config.url.app_assets + 'css/spark.forum.hg.css'
        ]
        });
    $form.find('input[name=text_type]').val('html');
    return editor;
  }

  function getPropsFromForm($form) {
    var values = {};
    $form.find('input,textarea,select').each(function() {
      if ($(this).attr('type') == 'checkbox') {
        if ($(this).is(':checked')) {
          values[$(this).attr('name')] = $(this).val();
        } else {
          values[$(this).attr('name')] = 0;
        }
      } else {
        values[$(this).attr('name')] = $(this).val();
      }
    });
    return values;
  }

  return {
    'makeEditor': makeEditor,
    'getPropsFromForm': getPropsFromForm
  }

});
