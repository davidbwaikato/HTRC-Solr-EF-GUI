
var langs_with_pos = [];
var langs_without_pos = [];

function ajax_error(jqXHR, textStatus, errorThrown) {
    alert('An error occurred... Look at the console (F12 or Ctrl+Shift+I, Console tab) for more information!');

    console.log('jqXHR:' + jqXHR);
    console.log('textStatus:' + textStatus);
    console.log('errorThrown:' + errorThrown);
}		


$(function() {
    //var luke_url="solr1.ischool.illinois.edu/solr/htrc-full-ef_shard6_replica1/admin/luke";
    var luke_url="htrc-full-ef_shard6_replica1/admin/luke";
    
    $.ajax({
	type: 'GET',
	url: luke_url,
	dataType: 'xml',
	success: function(xml_data) {
	    var $fields = $(xml_data).find("lst[name='fields']");

	    var langs_with_pos_keys = {};
	    
	    $fields.children().each(function() {
		var name = $(this).attr("name");
		if (name.endsWith("_htrctoken")) {
		    if (name.startsWith("xxxx")) {
			var num_underscores = (name.match(/_/g) || []).length;
			if (num_underscores == 2) {
			    var lang = name.replace(/^xxxx/,"").replace(/_.*?_htrctoken$/,"");
			    langs_with_pos_keys[lang]=1;
			}
			else {
			    var lang = name.replace(/^xxxx/,"").replace(/_htrctoken$/,"");
			    langs_without_pos.push(lang);
			}
		    }
		}
		
	    });

	    // Get the keys
	    langs_with_pos = $.map(langs_with_pos_keys, function(v, i){
		return i;
	    });
	    
	    var $js_excerpt = $('#js-excerpt');
	    
	    $js_excerpt.append("var langs_with_pos =" + JSON.stringify(langs_with_pos) + ";" + "<br/>");
	    $js_excerpt.append("var langs_without_pos =" + JSON.stringify(langs_without_pos) + ";");
	    
	    //console.log("xml_data = " + $fields.html());
	},
	error: ajax_error
    });
});
