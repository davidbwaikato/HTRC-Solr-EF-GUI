
function stream_generate_item(line,id,title)
{
    var css_class = (line%2 == 0) ? 'class="evenline"' : 'class="oddline"';
    
    var html_item = "";


    var babel_url = "https://babel.hathitrust.org/cgi/pt?id="+id+";view=1up;seq="+1;

    html_item += '<p ' + css_class + '>';
    //html_item += ' <span style="font-style: italic;" name="'+id+'"></span><br>';
    html_item += '<a target="_blank" href="' + babel_url + '">' + id + ': ' + title + '</a>';
    html_item += '</p>';

    return html_item;
}



function stream_show_results(jsonData) {
    var docs = jsonData["result-set"].docs;
    var num_docs = docs.length -1;

    $('.search-in-progress').css("cursor","auto");
    
    var $search_results = $('#search-results');

    if (num_docs>0) {
	$search_results.html("<p>Results: " + num_docs + " volumes matched</p>");
	/*
	var from = parseInt(store_search_args.start);
	var to = from + num_rows;
	$search_results.append("<p>Showing matches: "+from+"-" + to + "</p>");
	*/
    }
    else {
	$search_results.html("<p>No volumes matched your query</p>");
    }

    for (var i=0; i<num_docs; i++) {
	var doc = docs[i];
	var id = doc.id;
	var title = doc.title_t;

	var html_item = stream_generate_item(i,id,title);
	$search_results.append(html_item);
    }
    return;
    // ****
    
    var htids = [];

    var prev_id = null;
    var prev_pages = [];
    
    var i=0;
    var line_num = 0;
    while (i<num_docs) {
//    for (var i=0; i<num_docs; i++) {
	var doc = docs[i];
	var id_and_page = doc.id.split(".page-");
	var id = id_and_page[0];
	var seqnum = parseInt(id_and_page[1]) +1; // fix up ingest error
	//var page = seqnum+1;
	//var page = seqnum-1;
	var page = seqnum;

	if ((prev_id != null) && (id != prev_id)) {
	    // time to output previous item
	    var html_item = generate_item(line_num,prev_id,prev_pages);
	    $search_results.append(html_item);
	    line_num++;
	    prev_pages = [page];
	}
	else {
	    // accumulate pages
	    prev_pages.push(page)
	}
	
	htids.push("htid:"+id);

	prev_id = id;
	i++;
    }
    
    var html_item = generate_item(line_num,prev_id,prev_pages);
    $search_results.append(html_item);

    
    document.location.href="#search-results-anchor";
    
    var next_prev = '<p style="width:100%;"><div id="search-prev" style="float: left;"><a>&lt; Previous</a></div><div id="search-next" style="float: right;"><a>Next &gt;</a></div></p>';
    
    $search_results.append(next_prev);
    $('#search-prev').click(function(event) { show_new_results(-1*num_rows); });
    $('#search-next').click(function(event) { show_new_results(num_rows); });

    var search_start = store_search_args.start;
    if (search_start==0) {
	$('#search-prev').hide();
    }
    
    // Example URL for catalog metadata (multiple items)
    // http://catalog.hathitrust.org/api/volumes/brief/json/id:552;lccn:70628581|isbn:0030110408

    var htids_str = htids.join("|",htids);
    var cat_url = "http://catalog.hathitrust.org/api/volumes/brief/json/" + htids_str;
    	$.ajax({
	    url: cat_url,
	    dataType: 'jsonp',
	    jsonpCallback: "add_titles"
	});


    //var json_pretty = JSON.stringify(jsonData.response, null, '\t');
    //$('#search-results').text(json_pretty)
}


function stream_submit_action(event)
{
    event.preventDefault();

    $('.search-in-progress').css("cursor","wait");

    var vq_text     = $('#vq').val();
    
    store_search_action = $('#search-form').attr("action");
    
    var arg_indent = $('#indent').attr('value');
    var arg_wt     = $('#wt').attr('value');
    var arg_start  = $('#start').attr('value');
    var arg_rows   = $('#rows').attr('value');
    var q_text     = $('#q').val();

    group_by_vol_checked = $('#group-results-by-id:checked').length;

    
    if ((q_text === "") && (vq_text === "")) {
	$('.search-in-progress').css("cursor","auto");
	alert("No query term entered");
	return;
    }

    var expr_all = "";
    var expr_md = "";
    var expr_tx = "";
    
    if (vq_text !== "") {
	// simplified case of issuing a volume-based metadata query
	//expr=search(col,q,fl,sort,rows)

    
	//var expr = "expr=search(";
	expr_md = "search(";
	expr_md += "htrc-full-ef20";
	expr_md += ",q=\""+vq_text+"\"";
	expr_md += ",fl=\"volumeid_s,id,title_t\"";
	expr_md += ",sort=\"id asc"+"\"";
	expr_md += ",indent=\""+arg_indent+"\"";
	expr_md += ",wt=\""+arg_wt+"\"";
	expr_md += ",start=\""+arg_start+"\"";
	expr_md += ",rows=\""+arg_rows+"\"";
	expr_md += ")";
	
	store_search_args = { q: vq_text, indent: arg_indent, wt: arg_wt,
			      start: arg_start, rows: arg_rows };
    }

    if (q_text !== "") {
	
	var fields = [];
	var universal_pos_tags = [ "VERB", "NOUN", "ADJ", "ADV", "ADP", "CONJ", "DET", "NUM", "PRT", "X" ];

	var arg_q = "";
	
	var split_q_text = q_text.split(/\s+/);
	for (var qi=0; qi<split_q_text.length; qi++) {
	    q_text = split_q_text[qi];
	    
	    for (var li=0; li<langs_with_pos.length; li++) {
		var lang = langs_with_pos[li];
		var lang_enabled_id = lang + "-enabled";
		var $lang_enabled_cb = $('#'+lang_enabled_id);
		if ($lang_enabled_cb.is(':checked')) {
		    console.log("Extracting POS tags for: " + lang);
		    
		    for (var ti=0; ti<universal_pos_tags.length; ti++) {
			var tag = universal_pos_tags[ti];
			var lang_tag_id = lang+"-"+tag+"-htrctoken-cb";
			var $lang_tag_cb = $('#'+lang_tag_id);
			if ($lang_tag_cb.is(':checked')) {
			    //var lang_tag_field = "xxxx"+lang+"_"+tag+"_htrctoken";
			    var lang_tag_field = lang+"_"+tag+"_htrctoken";
			    fields.push(lang_tag_field+":"+q_text);
			}
		    }
		}
	    }
	    
	    for (var li=0; li<langs_without_pos.length; li++) {
		var lang = langs_without_pos[li];
		var lang_enabled_id = lang + "-enabled";
		var $lang_enabled_cb = $('#'+lang_enabled_id);
		
		if ($lang_enabled_cb.is(':checked')) {
		    console.log("Adding in non-POS field for: " + lang);
		    //var lang_tag_field = "xxxx"+lang+"_htrctoken";
		    var lang_tag_field = lang+"_htrctoken";
		    fields.push(lang_tag_field+":"+q_text);	    
		}
	    }
	
	    if (fields.length == 0) {
		alert("No languages selected");
		return;
	    }

	    if (qi>0) {
		arg_q += " OR ";
	    }
	    
	    arg_q += fields.join(" OR ");
    
	} // end of for each split q_text
	
	// Example search on one of the htrc-full-ef fields is: 
	//  q=en_NOUN_htrctoken:farming
	
	store_search_args = { q: arg_q, indent: arg_indent, wt: arg_wt, start: arg_start, rows: arg_rows };

	store_search_args.sort="id asc";
	store_search_args.fl="volumeid_s,id";
	
	var expr_tx = "search(htrc-full-ef20";
	
	for (var k in store_search_args) {
	    if (store_search_args.hasOwnProperty(k)) {
		var v = store_search_args[k];
		expr_tx += "," + k + "=\"" + v + "\"";
	    }
	}
	expr_tx += ")";
    }
    

    if ((expr_md != "") && (expr_tx != "")) {
	expr = "expr=intersect(" + expr_md + "," + expr_tx  + ", on=\"id=volumeid_s\")";
    }
    else if (expr_md != "") {
	expr = "expr=" + expr_md;
    }
    else if (expr_tx != "") {
	expr = "expr=" + expr_tx;
    }
    else {
	// both empty
	console.log("Warning: query was empty");
    }
    

    $.ajax({
	type: 'GET',
	url: store_search_action,
	data: expr,
	dataType: 'json',
	success: stream_show_results,
	error: ajax_error
    });

}


$(function() {
    if ($('#stream-search-submit').length>0) {
	$('#stream-search-submit').click(stream_submit_action);
    }

});
