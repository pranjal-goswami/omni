var debug = true;
$(function($) {
    var username = $.cookie('username');
    var password = $.cookie('password');
    domain = $.cookie('domain');
    setSize();
    if ((username != undefined) && (password != undefined)) {
        setAuthKey(username,password);
        login(username);
        updateUsage();
    } else {
        checkCookieBool();
        ieHorror();
        $('#login').css('display','block');
    }
    setSize();
    $("#server_url").val(getParameterByName("server_url"));
    $("#user_email").val(getParameterByName("email"));
    $("#user_pw").val(getParameterByName("password"));
});

$(window).resize(function() {
	if(debug) console.log("Window Resized");
    setSize();
});

var authKey, 
    domain,
    fileType,
    action,
	replaceFileId;

function api(resource, call_type, data, successfunc, errorfunc){
    $.ajax({
        url: domain+resource,
        data : data,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", authKey);
        },
        type: call_type,
        async: false,
        crossDomain: true,
        dataType: "json",
        success:  successfunc,
        error: errorfunc
    });
}

function ieHorror() {
    if (getInternetExplorerVersion() != -1) {
        console.log(getInternetExplorerVersion());
    }
}

function getInternetExplorerVersion()
// Returns the version of Internet Explorer or a -1
// (indicating the use of another browser).
{
  var rv = -1; // Return value assumes failure.
  if (navigator.appName == 'Microsoft Internet Explorer')
  {
    var ua = navigator.userAgent;
    var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
    if (re.exec(ua) != null)
      rv = parseFloat( RegExp.$1 );
  }
  return rv;
}

function toggleCheckboxes(source) {
    checkboxes = document.getElementsByName('list');
    for(var i=0; i<checkboxes.length; i++) {
        if (source[0].checked)
            checkboxes[i].checked = true;
        else
            checkboxes[i].checked = false;
    }
	if($('input[name=list]:checked').length==0) {
		$('#select_count').addClass('hidden'); return
	}
	else{
		$("#selected_files").html($('input[name=list]:checked').length);
		$('#select_count').removeClass('hidden');
	}
	console.log($('input[name=list]:checked').length);
}

function setAuthKey(username,password) {
    authKey = "Basic " + btoa(username + ':' + password);
}

function login(username) {
	$('#login-failed').hide(200);
    api("/v1/user", "GET", null, loginSuccessFunction, reloadLoginFailFunction);
}

function loginSuccessFunction(html) {
    var username = $('#user_email').val();
    if (username.length == 0) {
        username = $.cookie('username');
    }
    if ($.cookie('domain') == undefined) {
        $.cookie('domain',domain, { expires: 1} );
        $.cookie('username',username,{ expires:1});
        $.cookie('password',$('#user_pw').val(),{expires:1});
    }
    $('#login').css('display','none');
    $('#main').css('display','block');
    $('#username').find('#usr_name').html(username);
	$('#username').removeClass('hidden');
    getDocList();
}

function reloadLoginFailFunction(html) {
    $.removeCookie('domain');
    $.removeCookie('username');
    $.removeCookie('password');
    $('#login').css('display', 'block');
}

function loginFailFunction(html) {
	if(debug) console.log("Login failed");
    if (html.responseText == "") {
        $('#login-failed').html('Please enter a valid url');
    } else {
        $('#login-failed').html('Check your email, password, or URL');
    }
	$('#login-failed').show(500);
}

function checkCookieBool() {
    if (!navigator.cookieEnabled)
        $('#cookie-warning').html('Please enable cookies.');
}

function toggleOverlay() {
    $('#overlay').css('display','none');
    if ($('#instructions-lightbox').css('display') == 'block') {
        $('#instructions-lightbox').css('display','none');
    }
    if ($('#send-report-lightbox').css('display') == 'block') {
        $('#send-report-lightbox').css('display','none');
    }
}


function showError(html) {
	if (html.substring) {
		var errorString = '<div id="table-notification" class="error-notification">'+
				'<a id="table-notification-close"><i id="close-icon" class="icon-remove-circle"></i></a>'+
				'<p>ERROR: ' + html + '</p></div>';            
	} else {
		var err = $.parseJSON(html.responseText);
		var errorString = '<div id="table-notification" class="error-notification">'+
				'<a id="table-notification-close"><i id="close-icon" class="icon-remove-circle"></i></a>'+
				'<p>ERROR: ' + err.userMessage + '</p></div>';
	}
	if(debug) console.log("Showing Error Message : "+errorString);
	$.growl.error({message:errorString})
	//$('#notification-list').prepend(errorString);
}

function showSuccess(successMsg) {
	var successString = '<div id="table-notification" class="success-notification">'+
				'<a id="table-notification-close"><i id="close-icon" class="icon-remove-circle"></i></a>'+
				'<p>' + successMsg + '</p></div>';
	if(debug) console.log("Showing Success Message : "+successMsg);
	$.growl.notice({message:successMsg});
	//$('#notification-list').prepend(successString);
}

function exportDownloadFile(type) {
	var checkedList = $('input[name=list]:checked');
	var id, linkURL;
	var links = new Array(checkedList.length);
	if (checkedList.length < 1) {
		showError('Please select a file to download');
	} else {
		for (var i=0; i<checkedList.length; i++) {
			data = {format:type};
			api("/v1/documents/"+checkedList[i].id,"GET",data,downloadSuccess,downloadFail);
		}
	}
	updateUsage();
}

function exportDownloadFileById(id, type) {
	data = {format:type};
	api("/v1/documents/"+id,"GET",data,downloadSuccess,downloadFail);
	updateUsage();
}
function downloadSuccess(html) {
	if(debug) console.log(html);
	
	var iframe = "<iframe src='"+ html.url +"' style='display:none'></iframe>";
	$('header').append(iframe);
	showSuccess('Successfully started downloading');
}

function downloadFail(html) {
	success = false;
	showError(html);
}

function getDocList() {
	api("/v1/documents","GET",null,docListSuccessFunction,function(html) {showError(html)});
	updateUsage();
	
}

function docListSuccessFunction(html) {
	$('#doc-table').hide();
	$('#doc-table').find('tbody').remove();
	if(debug) console.log(html)
	var htmlString = '';
	if (html.documents.length < 1) {
		$('.no-files').show(200);
	} else {
		htmlString += '<tbody>';
		for (var i=0; i<html.documents.length; i++) {
			var date = new Date(html.documents[i].modifiedDate*1000);
			//console.log(html.documents[i].modifiedDate*1000);
			dateString = date.getFullYear().toString() + '-' + ('0'+ (date.getMonth()+1)).slice(-2) + '-' +
							('0' + (date.getDate())).slice(-2) + ' ' + date.getHours() + ':' + ('0' + date.getMinutes()).slice(-2);
			htmlString = htmlString + '<tr class="table-list">' +
			'<td><input type="checkbox" class="checkbox" name="list" id="' + html.documents[i].id +'"></td>' +
			'<td class="table-name">' + html.documents[i].name + '</td>' +
			'<td class="table-type">' + html.documents[i].size + ' B</td>' +
			'<td class="last-col">' + dateString + '</td>' +
			'<td style="width:40px;"><a class="text-danger" href="#" onclick="javascript: deleteDocById('+ html.documents[i].id + 
			')"><span class="fa fa-trash-o"></span></a></td>' +
			'<td style="width:40px;"><div class="btn-group">'+
			 	'<a href="#" type="button" class="dropdown-toggle text-info" title="Replace this File" data-toggle="dropdown">' +
				 '<span class="fa fa-clipboard"></span>  ' +
			  '</a>' +
			  '<ul class="dropdown-menu" role="menu">' +
			   		'<li><a href="#" onclick="javascript: replaceFileById('+ html.documents[i].id +',\'xml\''+
					')"><span class="fa fa-code"></span> &nbsp; &nbsp; <span class="format">XML</span></a></li>'+
					'<li><a href="#" onclick="javascript: replaceFileById('+ html.documents[i].id +',\'html\''+
					')"><span class="fa fa-html5"></span> &nbsp; &nbsp; <span class="format">HTML</span></a></li>'+
					'<li><a href="#" onclick="javascript: replaceFileById('+ html.documents[i].id +',\'json\''+
					')"><span class="fa">{ }</span> &nbsp; &nbsp; <span class="format">JSON</span></a></li>'+
					'<li><a href="#" onclick="javascript: replaceFileById('+ html.documents[i].id +',\'txt\''+
					')"><span class="fa fa-text-height"></span> &nbsp; &nbsp; <span class="format">TXT</span></a></li>'+
					'<li><a href="#" onclick="javascript: replaceFileById('+ html.documents[i].id +',\'csv\''+
					')"><span class="fa">x,</span> &nbsp; &nbsp; <span class="format">CSV</span></a></li>'+
					'<li><a href="#" onclick="javascript: replaceFileById('+ html.documents[i].id +',\'sql\''+
					')"><span class="fa fa-tasks"></span> &nbsp; &nbsp; <span class="format">SQL</span></a></li>'+
			  '</ul>' +
			'</div></td>' +
			'<td style="width:40px;"><div class="btn-group">'+
			 	'<a href="#" type="button" class="dropdown-toggle text-success" title="Download File" data-toggle="dropdown">' +
				 '<span class="fa fa-download"></span>  ' +
			  '</a>' +
			  '<ul class="dropdown-menu" role="menu">' +
			   		'<li><a href="#" onclick="javascript: exportDownloadFileById('+ html.documents[i].id +',\'xml\''+
					')"><span class="fa fa-code"></span> &nbsp; &nbsp; <span class="format">XML</span></a></li>'+
					'<li><a href="#" onclick="javascript: exportDownloadFileById('+ html.documents[i].id +',\'html\''+
					')"><span class="fa fa-html5"></span> &nbsp; &nbsp; <span class="format">HTML</span></a></li>'+
					'<li><a href="#" onclick="javascript: exportDownloadFileById('+ html.documents[i].id +',\'json\''+
					')"><span class="fa">{ }</span> &nbsp; &nbsp; <span class="format">JSON</span></a></li>'+
					'<li><a href="#" onclick="javascript: exportDownloadFileById('+ html.documents[i].id +',\'txt\''+
					')"><span class="fa fa-text-height"></span> &nbsp; &nbsp; <span class="format">TXT</span></a></li>'+
					'<li><a href="#" onclick="javascript: exportDownloadFileById('+ html.documents[i].id +',\'csv\''+
					')"><span class="fa">x,</span> &nbsp; &nbsp; <span class="format">CSV</span></a></li>'+
					'<li><a href="#" onclick="javascript: exportDownloadFileById('+ html.documents[i].id +',\'sql\''+
					')"><span class="fa fa-tasks"></span> &nbsp; &nbsp; <span class="format">SQL</span></a></li>'+
			  '</ul>' +
			'</div></td>' +
			'</tr>'
		}
		htmlString += '</tbody>';
		$('.no-files').hide();
		$('#doc-table').append(htmlString);
		$('#doc-table').show();
		$('input[name=list]').change(function(){
			if($('input[name=list]:checked').length==0) {
				$('#select_count').addClass('hidden'); return
			}
			else{
				$("#selected_files").html($('input[name=list]:checked').length);
				$('#select_count').removeClass('hidden');
			}
			console.log($('input[name=list]:checked').length);
		});
		if($('input[name=list]:checked').length==0) {
			$('#select_count').addClass('hidden'); return
		}
		else{
			$("#selected_files").html($('input[name=list]:checked').length);
			$('#select_count').removeClass('hidden');
		}
		/*$('.table-sorted').tablesorter({
			headers: {
				0: {
					sorter: false
				},
			}
		});*/
	}
}

function deleteDoc() {
	var r = confirm("Are you sure you want to delete selected files?");
	if(r==false) {
		if(debug) console.log("File Delete cancelled");
		return;
	}
	if ($('#checkbox-toggle-button').is(':checked')) {
		api("/v1/documents","DELETE",null,function(html){showSuccess('Successfully deleted all files')}, function(html){showError(html)});
	} else {
		var checkedList = $('input[name=list]:checked');
		if (checkedList.length == 0 ) {
			showError('Please select file(s) to delete');
		} else {
			var id, errorMsg;
			var success = false;
			for (var i=0; i<checkedList.length; i++) {
				id = checkedList[i].id;
				api("/v1/documents/"+id,"DELETE",null,function(html) {success=true},function(html){errorMsg=html});
			}
			if (success) {
				var sucStr = 'Successfully deleted ' + checkedList.length + ' file';
				if (checkedList.length > 1) {
					sucStr = sucStr + 's';
				}
				showSuccess(sucStr);
			} else {
				showError(errorMsg);
			}
		}
		
	}
	getDocList();
	updateUsage();
}
function deleteDocById(docId) {
	var id, errorMsg;
	var success = false;
	var r = confirm("Delete this file?");
	if(r==true){
		api("/v1/documents/"+docId,"DELETE",null,function(html) {success=true},function(html){errorMsg=html});
		if (success) {
			var sucStr = 'Successfully deleted file';
			showSuccess(sucStr);
		} else {
			showError(errorMsg);
		}
		getDocList();
		//Extra API Usage
		updateUsage();
	}
}

function updateUsage() {
	api("/v1/user","GET",null,updateSuccess,function(html){showError(html)});
}

function updateSuccess(html) {
	var perDay = html.user.calls.lastDay;
	var perMin = html.user.calls.lastMinute;
	var total = html.user.calls.total;
	$('#user-info').find('#min-usage').html(perMin);
	$('#user-info').find('#day-usage').html(perDay);
	$('#user-info').find('#total-usage').html(total);
}

function getUploadFile() {
	if ($('.upload-notification').length > 0) {
		showError('Please upload your current file first');
	} else {
		var input = $('#upload-input');
		input.replaceWith(input = input.clone(true));
		document.getElementById("upload-input").click();
	}
}

function getReplaceFile(){
	if ($('.replace-notification').length > 0) {
		showError('Please replace your current file first');
	} else {
		var input = $('#replace-input');
		input.replaceWith(input = input.clone(true));
		document.getElementById("replace-input").click();
	}
}

function setSize() {
	var windowH = $(window).height();
	var windowW = $(window).width();
	if (windowW < 650) {
		$('#file-table').width(650-$('#dashboard').width());
	} else {
		$('#file-table').width(windowW-$('#dashboard').width());
	}
	$('#dashboard').height($('#file-table').height());
	if ($('#file-table').height() < (windowH-$('header').height())) {
		$('#dashboard').height(windowH-$('header').height());
	}

	if ($('#overlay').length > 0) {
		$('#overlay').height($('#dashboard').height() + $('header').height());
	}
}

$('#login-form').submit(function(e){
	e.preventDefault();
	domain = $('#server_url').val().replace(/\/+$/, "");
	username = $('#user_email').val();
	password = $('#user_pw').val();
	setAuthKey(username,password);
	$('#login-failed').hide();
	api("/v1/user", "GET" ,null, loginSuccessFunction, loginFailFunction);
});

    $('#send-report').click(function() {
        $('#send-report-lightbox').toggle();
        $('#overlay').toggle();
    });
    $('#send-report-lightbox').click(function() {
        event.stopPropagation();
    });
    $(document).keyup(function(e) {
        if(e.keyCode == 27) {
            toggleOverlay();
        }
    });
    $('#overlay').click(function() {
        toggleOverlay();
    });

  

    $('.upload li a').click(function() {
        action = "upload";
		var r = $(this).find('span.format').html();
        fileType = r.toLowerCase();
		//alert(fileType);
        fileType.replace(/\s+/g, ' ');
        getUploadFile();
    });



    $("#upload-input").change(function() {
        uploadOrReplaceFile(this);
    });

    $("#replace-input").change(function() {
        var filename = $(this).val();
            filename = filename.replace("C:\\fakepath\\","")
            
			var prependString = '<div id="table-notification" class="alert alert-info replace-notification">'+
			'<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
			'<p><span style="font-weight:300;">Replace</span> <span style="font-weight:700;">' + 
			$('#'+replaceFileId).parent().siblings('.table-name').text() + 
			' <span style="font-weight:300;">with</span> '+filename+'</span>? '+
			'<br><span class="upload-choices">'+
			'<a class="btn btn-xs btn-info" id="replace-yes">Yes</a><a class="btn btn-xs btn-default" id="replace-no">No</a></span></p></div>'
            $('#notification-list').prepend(prependString);
    });

    function uploadOrReplaceFile(input) {
        var filename = $(input).val();
        var expression = action;
        switch(expression) {
            case "upload":
			if(debug) console.log('Upload confirmation required')
                filename = filename.replace("C:\\fakepath\\","")
                var prependString = '<div id="table-notification" class="alert alert-info upload-notification">' +
					'<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                    '<p>Upload <span style="font-weight:700;">'+filename+
					'</span>? <br><p class="upload-choices">'+
					'<a class="btn btn-xs btn-info" id="upload-yes">Yes</a> &nbsp; <a class="btn btn-xs btn-default" id="upload-no">No</a></p></p></div>'
                $('#notification-list').prepend(prependString);
                break;
            case "replace":
                var fileIDs = $('input[name=list]:checked');
                if (fileIDs.length > 0) {
                    fileID = fileIDs[0].id;
                    filename = filename.replace("C:\\fakepath\\","")
                    var prependString = '<div id="table-notification" class="alert alert-warning replace-notification">' +
					'<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                    '<p><span style="font-weight:300;">Replace</span> <span style="font-weight:700;">' + 
					$('#'+fileID).parent().siblings('.table-name').text() + 
					'<span style="font-weight:300;">with</span> '+filename+'</span>? '+
					'<br><span class="upload-choices">'+
					'<a class="btn btn-xs btn-info" id="replace-yes">Yes</a> &nbsp; '+
					' &nbsp; <a class="btn btn-xs btn-info" id="replace-no">No</a></span></p></div>'
                    $('#notification-list').prepend(prependString);
                } else {
                    showError('Please select a file to replace first');
                }
                break;
        }
    }

    $('.download li a').click(function() {
		var r = $(this).find('span.format').html()
        exportDownloadFile(r.toLowerCase());
    });
    $(document).on('click', '#upload-no',function() {
        $(this.parentElement.parentElement).remove();
    });
    $(document).on('click', '#replace-no',function() {
        $(this.parentElement.parentElement).remove();
    });
    $(document).on('click', '#upload-yes',function() {
        $('#upload-form').ajaxSubmit({
            url: domain + '/v1/documents',
            data: {
                format: fileType
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", authKey);
            },
            type: 'POST',
            success: function(html) {
                $('#upload-yes').parent().parent().remove();
                showSuccess('Successfully uploaded');
                getDocList();
            },
            error: function(html) {
                $('#upload-yes').parent().parent().remove();
                showError(html);
            }
        });
        updateUsage();
    });

    $(document).on('click', '#replace-yes', function() {
       
	   id=replaceFileId;
		$('#replace-form').ajaxSubmit({
			url: domain + '/v1/documents/'+id,
			type: 'POST',
			data: {
				format: fileType
			},
			beforeSend: function (xhr) {
				xhr.setRequestHeader("Authorization", authKey);
			},
			success: function(html) {
				$('#replace-yes').parent().parent().parent().remove();
				showSuccess('Successfully replaced');
				getDocList();
			},
			error: function(html) {
				$('#replace-yes').parent().parent().parent().remove();
				showError(html);
			}
		});
		getDocList();
 
        updateUsage();
    });

function replaceFileById(id,type)
{
	replaceFileId = id;
	fileType = type;
	getReplaceFile();
}
function replaceById()
{
	$('#upload-form').ajaxSubmit({
		url: domain + '/v1/documents/'+id,
		type: 'POST',
		data: {
			format: type
		},
		beforeSend: function (xhr) {
			xhr.setRequestHeader("Authorization", authKey);
		},
		success: function(html) {
			$('#replace-yes').parent().parent().remove();
			showSuccess('Successfully replaced');
			getDocList();
		},
		error: function(html) {
			$('#replace-yes').parent().parent().remove();
			showError(html);
		}
	});
	getDocList();
	updateUsage();
}

$(document).on('click', '#table-notification-close', function() {
	$(this.parentElement).remove();
});

function fixDashboardHeight() {
	var dashboard = $('#dashboard');
	var filetableHeight = $('#file-list-table').height();
	var notificationsHeight = $('#notification-list').height();
	if (filetableHeight + notificationsHeight > dashboard.height()) {
		dashboard.height(filetableHeight + notificationsHeight);
	}
}

    $('#notification-list').bind('DOMNodeInserted', function() {
        setSize();
        fixDashboardHeight();
    });

    $(document).on(
    {
        mouseover: function() {
            $(this).css('color', '#C5C5C5');
        },
        mouseleave: function() {
            $(this).css('color',' white');
        }
    },
    '#table-notification-close');

    $('#logout').click(function() {
         $.removeCookie('username');
         $.removeCookie('password');
         $.removeCookie('domain');
         location.reload();
    });

    $('#delete-button').click(function() {
        deleteDoc();
    });

$('#checkbox-toggle-button').click(function(event) {
    toggleCheckboxes($('#checkbox-toggle-button'));
});

function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

