//'use strict';

$(function(){

  $('#classify').click(function(){

    chrome.storage.sync.get('label', function (predict) {
      var result = '';
      //console.log('PopUP Result Predicted ==> ' + predict.label);
      if(predict.label){
        result = predict.label;
        chrome.storage.sync.set({'label': result});

        $('#result').text(result);

        var notifOptions = {
          type: "basic",
          iconUrl: "images/icon-16.png",
          title: "Prediction Result",
          message: "Classified Article as "+ result +" :)"
        };
        chrome.notifications.create('predictNotif', notifOptions);

      } else {
        var notifOptionsError = {
          type: "basic",
          iconUrl: "images/icon-16.png",
          title: "Prediction Result",
          message: "Error: Article Could Not be Classified!!"
        };
        chrome.notifications.create('errorNotif', notifOptionsError);

      }

    });

    chrome.storage.sync.get('accuracy', function (data) {
      $('#accuracy').text(data.accuracy);

    });




  });


});


