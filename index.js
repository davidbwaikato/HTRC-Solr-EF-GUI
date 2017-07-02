var langs_with_pos = ["en", "de", "pt", "da", "nl", "sv"];

var langs_without_pos = [
	"af", "ar", "bg", "bn", "cs", "el", "es", "et", "fa", "fi", "fr", "he", "hi", "hr", "hu",
	"id", "it", "ja", "kn", "ko", "lt", "lv", "mk", "ml", "mr", "ne", "no", "pa", "pl",
	"ro", "ru", "sk", "sl", "so", "sq", "sv", "sw", "ta", "te", "th", "tl", "tr",
	"uk", "ur", "vi", "zh-cn", "zh-tw"
];

var num_rows = 20;
var filters = [];
var facet = ['genre_ss', 'language_t', 'pubPlace_s', 'bibliographicFormat_s'];
var facet_display_name = {'genre_ss':'Genre', 'language_t': 'Language', 'pubPlace_s': 'Place of Publication', 'bibliographicFormat_s': 'Original Format'};

function lang_pos_toggle(event) {
	var $this = $(this);
	var checked_state = $this.prop("checked");

	var id = $this.attr("id");
	var split_id = id.split("-");
	var related_id = split_id[0] + "-pos-choice";

	var disable_state = !checked_state;
	$('#' + related_id + " *").prop('disabled', disable_state);
}

function ajax_error(jqXHR, textStatus, errorThrown) {
	alert('An error occurred... Look at the console (F12 or Ctrl+Shift+I, Console tab) for more information!');

	console.log('jqXHR:' + jqXHR);
	console.log('textStatus:' + textStatus);
	console.log('errorThrown:' + errorThrown);
}


function add_titles(json_data) {
	var itemURLs = [];

	$.each(json_data, function (htid_with_prefix, htid_val) {
		var htid = htid_with_prefix.replace(/^htid:/, "");

		$.each(htid_val.records, function (internalid, metadata) {
			var title = metadata.titles[0];
			$("[name='" + htid + "']").each(function () {
				$(this).html(title)
			});
			console.log(htid + ", title = " + metadata.titles[0]);
		});

		$.each(htid_val.items, function (item_index, item_val) {
			if (item_val.htid == htid) {
				var itemURL = item_val.itemURL;
				itemURL = itemURL.replace(/^https:/, "http:");

				var ws_span = '<span style="display: none;"><br>[Workset: <span name="' + itemURL + '"></span>]</span>';
				$("[name='" + htid + "']").each(function () {
					$(this).append(ws_span)
				});
				console.log("itemURL = " + itemURL);
				itemURLs.push(itemURL);
			}
		});
	});

	workset_enrich_results(itemURLs);

}

function add_titles_solr(jsonData) {
	var itemURLs = [];
    //console.log("jsonData = " + jsonData);
    
        var response = jsonData.response;
	var docs = response.docs;
	var num_docs = docs.length;

	$.each(docs, function (doc_index, doc_val) {
	    var htid = doc_val.id;

	    var title = doc_val.title_s;
	    $("[name='" + htid + "']").each(function () {
		$(this).html(title)
	    });
	    console.log(htid + ", title = " + title);

	    var itemURL = doc_val.handleUrl_s;
	    itemURL = itemURL.replace(/^https:/, "http:");

	    var ws_span = '<span style="display: none;"><br>[Workset: <span name="' + itemURL + '"></span>]</span>';
	    $("[name='" + htid + "']").each(function () {
		$(this).append(ws_span)
	    });
	    //console.log("itemURL = " + itemURL);
	    itemURLs.push(itemURL);
	});

	workset_enrich_results(itemURLs);

}


function add_worksets(json_data) {

	//console.log("****" + JSON.stringify(json_data));
	$.each(json_data["@graph"], function (ws_index, ws_val) {
		var workset_id = ws_val["@id"];
		var workset_title = ws_val["http://purl.org/dc/terms/title"][0]["@value"];

		// http://acbres224.ischool.illinois.edu:8890/sparql?query=describe <http://worksets.hathitrust.org/wsid/189324112>&format=text/x-html+ul
		// http://acbres224.ischool.illinois.edu:8890/sparql?query=describe+%3Chttp%3A%2F%2Fworksets.hathitrust.org%2Fwsid%2F189324112%3E&format=text%2Fx-html%2Bul

		var describe_url = "http://acbres224.ischool.illinois.edu:8890/sparql?query=describe+<" +
			workset_id + ">&format=text%2Fx-html%2Bul";
		var hyperlinked_workset_title = '<a target="_blank" href="' + describe_url + '">' + workset_title + '</a>';

		var gathers = ws_val["http://www.europeana.eu/schemas/edm/gathers"]

		$.each(gathers, function (gather_index, gather_val) {
			var item_url = gather_val["@id"];

			$("[name='" + item_url + "']").each(function () {
				$(this).parent().show();
				if ($(this).children().size() >= 1) {
					$(this).append("; ");
				}

				$(this).append("<span>" + hyperlinked_workset_title + "</span>")
			});
		});
	});

}


function show_new_results(delta) {
	$('.search-in-progress').css("cursor", "wait");

	var start = parseInt(store_search_args.start)

	store_search_args.start = start + parseInt(delta);
	var url = "";
	for (k in store_search_args) {
		url += k + '=' + store_search_args[k] + "&";
	}

	for (k in facet) {
		url += 'facet.field=' + facet[k] + "&";
	}
	for (k in filters) {
		_k = filters[k].split("-");
		url += 'fq=' + _k[0] + ':("' + _k[1] + '")&';
	}


	$.ajax({
		type: 'GET',
		url: store_search_action,
		data: url,
		dataType: 'json',
		success: show_results,
		error: ajax_error
	});
}

function generate_item(line, id, id_pages) {
	var css_class = (line % 2 == 0) ? 'class="evenline"' : 'class="oddline"';

	var html_item = "";

	var id_pages_len = id_pages.length;

	for (var pi = 0; pi < id_pages_len; pi++) {
		var page = id_pages[pi];

		var seqnum = (page == 0) ? 1 : page;
		var babel_url = "https://babel.hathitrust.org/cgi/pt?id=" + id + ";view=1up;seq=" + seqnum;

		if (id_pages_len > 1) {

			if (pi == 0) {
				html_item += '<p ' + css_class + '>';
				html_item += '<span style="font-style: italic;" name="' +
					id + '"><span style="cursor: progress;">Loading ...</span></span><br>';
				if (page > 0) {
					html_item += id + ': <a target="_blank" href="' + babel_url + '">seq ' + seqnum + '</a> ';
				} else {
					// skip linking to the 'phony' page 0
					html_item += id;
				}
			} else {
				html_item += ', <a target="_blank" href="' + babel_url + '">seq ' + seqnum + '</a> ';
			}
		} else {
			html_item += '<p ' + css_class + '>';
			html_item += ' <span style="font-style: italic;" name="' +
				id + '"><span style="cursor: progress;">Loading ...</span></span><br>';

			if (page > 0) {
				html_item += '<a target="_blank" href="' + babel_url + '">' + id + ', seq ' + seqnum + '</a>';
			} else {
				html_item += '<a target="_blank" href="' + babel_url + '">' + id + ', all pages</a>';
			}

			html_item += '</p>';
		}

	}

	if (id_pages_len > 1) {
		html_item += "</p>";
	}

	return html_item;
}


function workset_enrich_results(itemURLs) {
	// prefix dcterms: <http://purl.org/dc/terms/>
	// prefix edm: <http://www.europeana.eu/schemas/edm/>
	// prefix htrc: <http://wcsa.htrc.illinois.edu/>
	// prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
	// prefix xsd: <http://www.w3.org/2001/XMLSchema#>

	// CONSTRUCT {
	// 	    ?wsid
	// 	rdf:type htrc:Workset ;
	// 	dcterms:title ?title ;
	// 	dcterms:creator ?cre ;
	// 	dcterms:created ?dat ;
	// 	edm:gathers ?gar.}

	// where {
	// 	    ?wsid
	// 	rdf:type htrc:Workset ;
	// 	dcterms:title ?title ;
	// 	dcterms:creator ?cre ;
	// 	dcterms:created ?dat ;
	// 	edm:gathers ?gar

	// 	FILTER ( ?gar  = <http://hdl.handle.net/2027/uc2.ark:/13960/t4fn12212> || ?gar = <http://hdl.handle.net/2027/uva.x030825627> )
	// 	       }

	var prefixes = "";
	prefixes += "prefix dcterms: <http://purl.org/dc/terms/>\n";
	prefixes += "prefix edm: <http://www.europeana.eu/schemas/edm/>\n";
	prefixes += "prefix htrc: <http://wcsa.htrc.illinois.edu/>\n";
	prefixes += "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n";
	prefixes += "prefix xsd: <http://www.w3.org/2001/XMLSchema#>\n";

	var graph_body = "";
	graph_body += " ?wsid\n";
	graph_body += "   rdf:type htrc:Workset ;\n";
	graph_body += "   dcterms:title ?title ;\n";
	graph_body += "   dcterms:creator ?cre ;\n";
	graph_body += "   dcterms:created ?dat ;\n";
	graph_body += "   edm:gathers ?gar .\n";

	var filter_array = [];
	var item_urls_len = itemURLs.length;
	for (var hi = 0; hi < item_urls_len; hi++) {
		var htid = itemURLs[hi];
		filter_array.push("?gar = " + "<" + htid + ">");
	}
	var filter = " FILTER ( " + filter_array.join(" || ") + " ) ";

	var construct = "CONSTRUCT {\n" + graph_body + "}\n";
	var where = "WHERE {\n" + graph_body + filter + "}\n";

	var sparql_query = prefixes + construct + where;
	//console.log("*** sparql query = " + sparql_query);

	// http://acbres224.ischool.illinois.edu:8890/sparql?default-graph-uri=&query
	// &format=application/x-json+ld&timeout=0&debug=on

	var sparql_url = "http://acbres224.ischool.illinois.edu:8890/sparql";
	var sparql_data = {
		"default-graph-uri": "",
		"format": "application/x-json+ld",
		"timeout": 0,
		"debug": "on"
	};
	sparql_data.query = sparql_query;

	$.ajax({
		type: "POST",
		url: sparql_url,
		data: sparql_data,
		dataType: 'jsonp',
		jsonpCallback: "add_worksets"
	});



}

function show_results(jsonData) {
	var response = jsonData.response;
	var num_found = response.numFound;
	var docs = response.docs;
	var num_docs = docs.length;

	var facet_fields = jsonData.facet_counts.facet_fields;

	//
	var facet_html = "";
	var _class = '';
	for (k in facet_fields) {
		facet_html += "<dl>";
		facet_html += "<dt class=\"facetField\">" + facet_display_name[k] + "</dt> ";
		item = facet_fields[k];
		ii = 0;
		for (var j = 0; j <= item.length / 2; j = j + 2) {

			if (item[j + 1] > 0) {
				if (filters.indexOf(k + "-" + item[j]) < 0) {
					_class = "showfacet";
					if (ii > 5) {
						_class = "hidefacet";
					}
					facet_html += '<dd class="' + _class + ' ' + k + '"><a href="javascript:;" data-obj="' + k + '"  data-key="' + item[j] + '">' + item[j] + '</a><span dir="ltr"> (' + item[j + 1] + ') </span></dd>';
					ii++;
				}

			}

		}
		if (ii > 5) {
			facet_html += '<dd><a href="" class="' + k + ' morefacets"><span class="moreless">more...</span></a><a href="" class="' + k + ' lessfacets" style="display: none;"><span class="moreless">less...</span></a></dd>'
		}
		facet_html += "</dl>";
	}
	if (facet_html != '') {
		$(".narrowsearch").show();
		$("#facetlist").html(facet_html);
	} else {
		$(".narrowsearch").hide();
	}

	$('.search-in-progress').css("cursor", "auto");

	var $search_results = $('#search-results');

	if (num_docs > 0) {
		$search_results.html("<p>Results: " + num_found + doc_units + "matched</p>");
		var from = parseInt(store_search_args.start) + 1;
		var to = from + num_rows - 1;
		if (to > num_found) {
			// cap value
			to = num_found;
		}
		var showing_matches = "<p>Showing matches: ";
		showing_matches += '<span id="sm-from">' + from + '</span>';
		showing_matches += "-";
		showing_matches += '<span id="sm-to">' + to + '</span>';
		showing_matches += "</p>";

		$search_results.append(showing_matches);
	} else {
		$search_results.html("<p>No pages matched your query</p>");
	}

	// Example form of URL
	//   https://babel.hathitrust.org/cgi/pt?id=hvd.hnnssu;view=1up;seq=11

	var ids = [];
        var htids = [];
    
	var prev_id = null;
	var prev_pages = [];

	var i = 0;
	var line_num = 1;
	while ((i < num_docs) && (line_num < num_rows)) {
		var doc = docs[i];
		var id_and_page = doc.id.split(".page-");
		var id = id_and_page[0];
		var seqnum;
		if (id_and_page.length > 1) {
			seqnum = parseInt(id_and_page[1]) + 1; // fix up ingest error
		} else {
			seqnum = 0;
		}
		var page = seqnum;

		if ((!group_by_vol_checked && prev_id != null) || ((prev_id != null) && (id != prev_id))) {
			// time to output previous item
			var html_item = generate_item(line_num, prev_id, prev_pages);
			$search_results.append(html_item);
			line_num++;
			prev_pages = [page];
		} else {
			// accumulate pages
			prev_pages.push(page)
		}

	        ids.push(id);
		htids.push("htid:" + id);

		prev_id = id;
		i++;
	}
	var num_pages = i;

	var html_item = generate_item(line_num, prev_id, prev_pages);
	//    console.log("*** html item = " + html_item);
	//    if (html_item != "") {
	$search_results.append(html_item);
	//	line_num++;
	//    }
	//console.log("*** line_num = " + line_num);

	//else {
	//	line_num--;
	//  }
	//    if ((i == num_docs) && (line_num != num_rows)) {
	//	line_num--;
	//    }

	document.location.href = "#search-results-anchor";

	var next_prev = '<p style="width:100%;"><div id="search-prev" style="float: left;"><a>&lt; Previous</a></div><div id="search-next" style="float: right;"><a>Next &gt;</a></div></p>';

	$search_results.append(next_prev);
	$('#search-prev').click(function (event) {
		show_new_results(-1 * num_rows);
	});
	$('#search-next').click(function (event) {
		show_new_results(num_rows);
	});

	var search_start = parseInt(store_search_args.start);
	if (search_start == 0) {
		$('#search-prev').hide();
	}

	var search_end = search_start + num_pages;
	if (search_end >= num_found) {
		$('#search-next').hide();
	}

	$('#sm-to').html(search_start + line_num);


	// Example URL for catalog metadata (multiple items)
	//   http://catalog.hathitrust.org/api/volumes/brief/json/id:552;lccn:70628581|isbn:0030110408

	//var htids_str = htids.join("|", htids);
	//var cat_url = "http://catalog.hathitrust.org/api/volumes/brief/json/" + htids_str;
	//$.ajax({
	//	url: cat_url,
	//	dataType: 'jsonp',
	//	jsonpCallback: "add_titles"
	//});


        // http://solr1.ischool.illinois.edu/solr/htrc-full-ef20/select?q=(id:mdp.39015071574472)&indent=on&wt=json&start=0&rows=200
    	

        var solr_search_action = $('#search-form').attr("action");
    var ids_and_str = ids.map(function(id){return "(id:"+id.replace(/\//g,"\\/").replace(/:/g,"\\:")+")"}).join(" OR ");

        //console.log(store_search_action + "?" + url);
        //console.log("ids_and_str = " + ids_and_str);
    
        var url_args = {
	    q: ids_and_str,
	    indent: "off",
	    wt: "json",	    
	    start: 0,
	    rows: ids.length,
	};
    
	$.ajax({
	    type: 'GET',
	    url: solr_search_action,
	    data: url_args,
	    dataType: 'json',
	    success: add_titles_solr,
	    error: ajax_error
	});


    
}

var store_search_args = null;
var store_search_action = null;

var group_by_vol_checked = 0;
var doc_units = "";


function expand_vfield(q_term, all_vfields) {
	var vfields = [];
	var metadata_fields = ["accessProfile_t", "genre_t", "imprint_t", "isbn_t", "issn_t",
		"issuance_t", "language_t", "lccn_t", "names_t", "oclc_t",
		"pubPlace_t", "pubDate_t", "rightsAttributes_t", "title_t", "typeOfResource_t"
	];

	if (all_vfields) {
		for (var fi = 0; fi < metadata_fields.length; fi++) {
			var vfield = metadata_fields[fi];
			vfields.push(vfield + ":" + q_term);
		}
	} else {
		if (q_term.match(/:/)) {
			vfields.push(q_term);
		} else {
			// make searching by title the default
			vfields.push("title_t:" + q_term);
		}
	}


	var vfields_str = vfields.join(" OR ");

	return vfields_str;
}

function expand_vquery_field_and_boolean(query, all_vfields) {
	// boolean terms
	//  => pos and lang field
	if (query === "") {
		return ""
	}

	var query_terms = query.split(/\s+/);
	var query_terms_len = query_terms.length;

	var bool_query_term = [];

	var i = 0;
	var prev_bool = "";

	for (var i = 0; i < query_terms_len; i++) {
		var term = query_terms[i];
		if (term.match(/^(and|or)$/i)) {
			prev_bool = term.toUpperCase();
		} else {
			if (i > 0) {
				if (prev_bool == "") {
					prev_bool = "AND";
				}
			}

			var expanded_term = expand_vfield(term, all_vfields); // **** only difference to POS version

			term = "(" + expanded_term + ")";

			if (prev_bool != "") {
				bool_query_term.push(prev_bool);
				prev_bool = "";
			}
			bool_query_term.push(term);
		}
	}

	var bool_query = bool_query_term.join(" ");

	return bool_query;
}


function expand_field_lang_pos(q_text, langs_with_pos, langs_without_pos, search_all_checked) {
	var fields = [];
	var universal_pos_tags = ["VERB", "NOUN", "ADJ", "ADV", "ADP", "CONJ", "DET", "NUM", "PRT", "X"];

	for (var li = 0; li < langs_with_pos.length; li++) {
		var lang = langs_with_pos[li];
		var lang_enabled_id = lang + "-enabled";
		var $lang_enabled_cb = $('#' + lang_enabled_id);
		if ($lang_enabled_cb.is(':checked')) {
			console.log("Extracting POS tags for: " + lang);

			for (var ti = 0; ti < universal_pos_tags.length; ti++) {
				var tag = universal_pos_tags[ti];
				var lang_tag_id = lang + "-" + tag + "-htrctoken-cb";
				var $lang_tag_cb = $('#' + lang_tag_id);
				if (search_all_checked || ($lang_tag_cb.is(':checked'))) {
					var lang_tag_field = lang + "_" + tag + "_htrctoken";
					fields.push(lang_tag_field + ":" + q_text);
				}
			}
		}
	}

	for (var li = 0; li < langs_without_pos.length; li++) {
		var lang = langs_without_pos[li];
		var lang_enabled_id = lang + "-enabled";
		var $lang_enabled_cb = $('#' + lang_enabled_id);

		if (search_all_checked || ($lang_enabled_cb.is(':checked'))) {
			console.log("Adding in non-POS field for: " + lang);
			var lang_tag_field = lang + "_htrctoken";
			fields.push(lang_tag_field + ":" + q_text);
		}
	}

	var fields_str = fields.join(" OR ");

	return fields_str;
}

function expand_query_field_and_boolean(query, langs_with_pos, langs_without_pos, search_all_checked) {
	// boolean terms
	//  => pos and lang field
	if (query === "") {
		return ""
	}

	var query_terms = query.split(/\s+/);
	var query_terms_len = query_terms.length;

	var bool_query_term = [];

	var i = 0;
	var prev_bool = "";

	for (var i = 0; i < query_terms_len; i++) {
		var term = query_terms[i];
		if (term.match(/^(and|or)$/i)) {
			prev_bool = term.toUpperCase();
		} else {
			if (i > 0) {
				if (prev_bool == "") {
					prev_bool = "AND";
				}
			}

			var expanded_term = expand_field_lang_pos(term, langs_with_pos, langs_without_pos, search_all_checked)

			term = "(" + expanded_term + ")";

			if (prev_bool != "") {
				bool_query_term.push(prev_bool);
				prev_bool = "";
			}
			bool_query_term.push(term);
		}
	}

	var bool_query = bool_query_term.join(" ");

	return bool_query;
}


function submit_action(event) {
	event.preventDefault();


	$('.search-in-progress').css("cursor", "wait");

	store_search_action = $('#search-form').attr("action");

	var arg_indent = $('#indent').attr('value');
	var arg_wt = $('#wt').attr('value');
	var arg_start = $('#start').attr('value');
	var arg_rows = $('#rows').attr('value');

	var q_text = $('#q').val().trim();
	var vq_text = $('#vq').val().trim();




	group_by_vol_checked = $('#group-results-by-vol:checked').length;

	var search_all_langs_checked = $('#search-all-langs:checked').length;
	var search_all_vfields_checked = $('#search-all-vfields:checked').length;

	if ((q_text === "") && (vq_text === "")) {
		$('.search-in-progress').css("cursor", "auto");
		alert("No query term(s) entered");
		return;
	}

	arg_vq = expand_vquery_field_and_boolean(vq_text, search_all_vfields_checked);

	arg_q = expand_query_field_and_boolean(q_text, langs_with_pos, langs_without_pos, search_all_langs_checked);

	//console.log("*** arg_vq = " + arg_vq);
	//console.log("*** arg_q = " + arg_q);

	if (arg_q == "") {
		if (arg_vq == "") {
			// arg_vq was empty to start with, but attempt to expand non-empty arg_q
			//   lead to an empty arg_q being returned
			$('.search-in-progress').css("cursor", "auto");
			alert("No languages selected");
			return;
		} else {
			arg_q = arg_vq;
			doc_units = " volumes ";
		}
	} else {
		if (arg_vq != "") {
			// join the two with an AND
			arg_q = "(" + arg_vq + ")" + " OR " + "(" + arg_q + ")";

			// also implies
			group_by_vol_checked = true;
		}
		doc_units = " pages ";
	}

	if ($('#vq').attr("data-key") == undefined) {
		$('#vq').attr("data-key", vq_text);
	}
	if ($('#vq').attr("data-key") != vq_text) {
		$('#vq').attr("data-key", vq_text);
		filters = [];
		facetlist_set();
	}
	//console.log("*** NOW arg_q = " + arg_q);

	// Example search on one of the htrc-full-ef fields is: 
	//  q=en_NOUN_htrctoken:farming

	store_search_args = {
		q: arg_q,
		indent: arg_indent,
		wt: arg_wt,
		start: arg_start,
		rows: arg_rows,
		facet: "on"
	};
	var url = "";
	for (k in store_search_args) {
		url += k + '=' + store_search_args[k] + "&";
	}

	for (k in facet) {
		url += 'facet.field=' + facet[k] + "&";
	}
	for (k in filters) {
		_k = filters[k].split("-");
		url += 'fq=' + _k[0] + ':("' + _k[1] + '")&';
	}

	if (group_by_vol_checked) {
		store_search_args.sort = "id asc";
	}
	//console.log("Solr URL:\n");

	//console.log(store_search_action + "?" + url);

	$.ajax({
		type: 'GET',
		url: store_search_action,
		data: url,
		dataType: 'json',
		success: show_results,
		error: ajax_error
	});

}

function generate_pos_langs() {
	var pos_checkbox = [{
		pos: "VERB",
		label: "Verbs",
		tooltip: "Verbs (all tenses and modes)"
	}, {
		pos: "NOUN",
		label: "Nouns",
		tooltip: "Nouns (common and proper)"
	}, {
		pos: "ADJ",
		label: "Adjectives",
		tooltip: null
	}, {
		pos: "ADV",
		label: "Adverbs",
		tooltip: null
	}, {
		pos: "ADP",
		label: "Adpositions",
		tooltip: "Adpositions (prepositions and postpositions)"
	}, {
		pos: "CONJ",
		label: "Conjunctions",
		tooltip: null
	}, {
		pos: "DET",
		label: "Determiners",
		tooltip: null
	}, {
		pos: "NUM",
		label: "Numbers",
		tooltip: "Cardinal numbers"
	}, {
		pos: "PRT",
		label: "Particles",
		tooltip: "Particles or other function words"
	}, {
		pos: "X",
		label: "Other",
		tooltip: "Other words, such as foreign words, typos, abbreviations"
	}];

	var $pos_fieldsets = $('#pos-fieldsets');

	for (var li = 0; li < langs_with_pos.length; li++) {

		var l = langs_with_pos[li];
		var lang_full = isoLangs[l].name;
		var lang_native_full = isoLangs[l].nativeName;
		var opt_title = (lang_full !== lang_native_full) ? 'title="' + lang_native_full + '"' : "";

		var opt_enabled = (l == "en") ? 'checked="checked"' : "";

		var legend = "";
		legend += '    <legend style="margin-bottom: 5px; padding-top: 15px;">\n';
		legend += '      <input type="checkbox" name="' + l + '-enabled" id="' + l + '-enabled" ' + opt_enabled + '/>\n';
		legend += '      <span ' + opt_title + '>' + lang_full + ':</span>\n';
		legend += '    </legend>\n';


		var check_box_list = [];

		for (var pi = 0; pi < pos_checkbox.length; pi++) {
			var pos_info = pos_checkbox[pi];
			var pos = pos_info.pos;
			var label = pos_info.label;
			var tooltip = pos_info.tooltip;
			var opt_tooltip = (tooltip != null) ? 'title="' + tooltip + '"' : "";

			var check_box = "";
			check_box += '    <input type="checkbox" name="' + l + '-' + pos + '-htrctoken-cb" id="' + l + '-' + pos + '-htrctoken-cb" checked="checked" />\n';
			check_box += '    <label for="' + l + '-' + pos + '-htrctoken-cb" ' + opt_tooltip + '>' + label + '</label>\n';

			check_box_list.push(check_box);
		}

		var fieldset = "";
		var opt_showhide_class = (li > 0) ? 'class="show-hide-lang"' : "";

		if (li == 1) {
			fieldset += '<button id="show-hide-lang">Show other languages ...</button>';
		}

		fieldset += '<fieldset ' + opt_showhide_class + '>\n';
		fieldset += legend;
		fieldset += '  <div id="' + l + '-pos-choice">\n';

		var check_box_join = check_box_list.join('&nbsp;');
		fieldset += check_box_join;

		fieldset += '  </div>\n';
		fieldset += '</fieldset>\n';

		$pos_fieldsets.append(fieldset);
		$('#' + l + '-enabled').click(lang_pos_toggle);

		if (l == "en") {
			$('#en-pos-choice *').prop('disabled', false);
		} else {
			$('#' + l + '-pos-choice *').prop('disabled', true);
		}
	}

	show_hide_lang()
}

function show_hide_lang() {
	$("#show-hide-lang").click(function (event) {
		event.preventDefault();
		if ($('.show-hide-lang:visible').length) {
			$('.show-hide-lang').hide("slide", {
				direction: "up"
			}, 1000);
			$('#show-hide-lang').html("Show other languages ...");
		} else {
			$('.show-hide-lang').show("slide", {
				direction: "up"
			}, 1000);
			$('#show-hide-lang').html("Hide other languages ...");
		}
	});
}

function generate_other_langs() {
	// setup other languages
	// for each 'langs_without_pos' generate HTML of the form:
	//    <input type="checkbox" name="fr-enabled" id="fr-enabled" />French
	var $other_langs = $('#other-langs');

	for (var i = 0; i < langs_without_pos.length; i++) {
		var lang = langs_without_pos[i];
		var labeled_checkbox = '<nobr>';

		labeled_checkbox += '<input type="checkbox" name="' + lang + '-enabled" id="' + lang + '-enabled" />';
		/*
	if (lang === "zh-cn") {
	    console.log("Mapping zh-cn => zh");
	    lang = "zh";
	}
	if (lang === "zh-tw") {
	    console.log("Mapping zh-tw => zh");
	    lang = "zh";
	}
*/
		var lang_full = isoLangs[lang].name;
		var lang_native_full = isoLangs[lang].nativeName;
		var opt_title = (lang_full !== lang_native_full) ? 'title="' + lang_native_full + '"' : "";

		labeled_checkbox += '<label for="' + lang + '-enabled" style="padding-left: 5px; padding-right: 10px;" ' + opt_title + '>' + lang_full + '</label>';

		labeled_checkbox += '</nobr> ';

		$other_langs.append(labeled_checkbox);

	}
}

$(function () {
	generate_pos_langs();

	generate_other_langs();

	if ($('#search-submit').length > 0) {
		$('#search-submit').click(submit_action);
	}

	$("#facetlist").on("click", "a", function () {
		//indexOf  
		$class = $(this).attr("class");
		if ($(this).hasClass("morefacets")) {
			obj = $class.split(" ")[0];
			$(this).hide();
			$("[class='" + obj + " lessfacets']").show();
			$("[class='hidefacet " + obj + "']").css({
				display: "block",
				visibility: "visible"
			});
			return false;
		} else if ($(this).hasClass("lessfacets")) {
			obj = $class.split(" ")[0];
			$(this).hide();
			$("[class='" + obj + " morefacets']").show();
			$("[class='hidefacet " + obj + "']").css({
				display: "none",
				visibility: "visible"
			});
			return false;
		} else {

			var obj = $(this).attr("data-obj");
			var key = $(this).attr("data-key");
			if (filters.indexOf(obj + "-" + key) < 0) {
				filters.push(obj + "-" + key);
			}
			$(this).parent().remove();
			facetlist_set();
			$('#search-submit').trigger("click");
		}



	});
	$(".filters").on("click", "a", function () {

		filters.splice($(this).parent().index(), 1);
		facetlist_set();
		$('#search-submit').trigger("click");
	});

});

function facetlist_set() {
	var facetlist_html = '';
	for (k in filters) {
		_k = filters[k].split("-");
		facetlist_html += '<li><a href="javascript:;" class="unselect"><img alt="Delete" src="img/cancel.png" class="removeFacetIcon"></a><span class="selectedfieldname">' + _k[0] + '</span>:  ' + _k[1] + '</li>';
	}

	$(".filters").html(facetlist_html);
}
