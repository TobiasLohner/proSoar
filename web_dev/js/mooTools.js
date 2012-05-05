function loadjsfile(filename){
 var fileref=document.createElement('script')
 fileref.setAttribute("type","text/javascript")
 fileref.setAttribute("src", filename)

 if (typeof fileref!="undefined")
  document.getElementsByTagName("head")[0].appendChild(fileref)
}

loadjsfile("js/MooTools/MUX/MUX.Dialog.js");
loadjsfile("js/MooTools/TabPane.js");
loadjsfile("js/MooTools/FormUpload/Request.File.js");
loadjsfile("js/MooTools/FormUpload/iFrameFormRequest.js");
loadjsfile("js/MooTools/FormUpload/Form.Upload.js");

