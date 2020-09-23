var ramed = [{
      "id": "",
      "date": "",
      "author": "",
      "title": "",
      "body": "Yükleniyor...",
      "attachment": ""
    }];


$('table').dynatable({
	dataset: {
		records: ramed
	}
});

var keke =$('table').data('dynatable');
$.getJSON( "./db.json", function( data ) {
	ramed = data["records"].map(el=>{
		el["date"] = el["year"]+"-"+el["month"]+"-"+el["day"];
		return el;
	});
	$('table').dynatable({
		dataset: {
			records: ramed
		}
	});
	if($(".dynatable-arrow").length===0){
		window.location.href = "./?sorts[date]=-1";
	}else{
		keke.settings.dataset.originalRecords = ramed;
		keke.process();
		keke.dom.update();
	}
});

$("#dynatable-query-search-").attr("placeholder","Search on Table")