console.log('bias-detector.js -- starting');

(function() {

  var Bayes = (function (Bayes) {
    Array.prototype.unique = function () {
      var u = {}, a = [];
      for (var i = 0, l = this.length; i < l; ++i) {
        if (u.hasOwnProperty(this[i])) {
          continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
      }
      return a;
    }
    var stemKey = function (stem, label) {
      return '_Bayes::stem:' + stem + '::label:' + label;
    };
    var docCountKey = function (label) {
      return '_Bayes::docCount:' + label;
    };
    var stemCountKey = function (stem) {
      return '_Bayes::stemCount:' + stem;
    };

    var log = function (text) {
      console.log(text);
    };

    var tokenize = function (text) {
      text = text.toLowerCase().replace(/\W/g, ' ').replace(/\s+/g, ' ').trim().split(' ').unique();
      return text;
    };

    var getLabels = function () {
      var labels = localStorage.getItem('_Bayes::registeredLabels');
      if (!labels) labels = '';
      return labels.split(',').filter(function (a) {
        return a.length;
      });
    };

    var registerLabel = function (label) {
      var labels = getLabels();
      if (labels.indexOf(label) === -1) {
        labels.push(label);
        localStorage.setItem('_Bayes::registeredLabels', labels.join(','));
      }
      return true;
    };

    var stemLabelCount = function (stem, label) {
      var count = parseInt(localStorage.getItem(stemKey(stem, label)));
      if (!count) count = 0;
      return count;
    };
    var stemInverseLabelCount = function (stem, label) {
      var labels = getLabels();
      var total = 0;
      for (var i = 0, length = labels.length; i < length; i++) {
        if (labels[i] === label)
          continue;
        total += parseInt(stemLabelCount(stem, labels[i]));
      }
      return total;
    };

    var stemTotalCount = function (stem) {
      var count = parseInt(localStorage.getItem(stemCountKey(stem)));
      if (!count) count = 0;
      return count;
    };
    var docCount = function (label) {
      var count = parseInt(localStorage.getItem(docCountKey(label)));
      if (!count) count = 0;
      return count;
    };
    var docInverseCount = function (label) {
      var labels = getLabels();
      var total = 0;
      for (var i = 0, length = labels.length; i < length; i++) {
        if (labels[i] === label)
          continue;
        total += parseInt(docCount(labels[i]));
      }
      return total;
    };
    var increment = function (key) {
      var count = parseInt(localStorage.getItem(key));
      if (!count) count = 0;
      localStorage.setItem(key, parseInt(count) + 1);
      return count + 1;
    };

    var incrementStem = function (stem, label) {
      increment(stemCountKey(stem));
      increment(stemKey(stem, label));
    };

    var incrementDocCount = function (label) {
      return increment(docCountKey(label));
    };

    Bayes.train = function (text, label) {
      registerLabel(label);
      var words = tokenize(text);
      var length = words.length;
      for (var i = 0; i < length; i++)
        incrementStem(words[i], label);
      incrementDocCount(label);
    };

    Bayes.guess = function (text) {
      var words = tokenize(text);
      var length = words.length;
      var labels = getLabels();
      var totalDocCount = 0;
      var docCounts = {};
      var docInverseCounts = {};
      var scores = {};
      var labelProbability = {};

      for (var j = 0; j < labels.length; j++) {
        var label = labels[j];
        docCounts[label] = docCount(label);
        docInverseCounts[label] = docInverseCount(label);
        totalDocCount += parseInt(docCounts[label]);
      }

      for (var j = 0; j < labels.length; j++) {
        var label = labels[j];
        var logSum = 0;
        labelProbability[label] = docCounts[label] / totalDocCount;

        for (var i = 0; i < length; i++) {
          var word = words[i];
          var _stemTotalCount = stemTotalCount(word);
          if (_stemTotalCount === 0) {
            continue;
          } else {
            var wordProbability = stemLabelCount(word, label) / docCounts[label];
            var wordInverseProbability = stemInverseLabelCount(word, label) / docInverseCounts[label];
            var wordicity = wordProbability / (wordProbability + wordInverseProbability);

            wordicity = ( (1 * 0.5) + (_stemTotalCount * wordicity) ) / ( 1 + _stemTotalCount );
            if (wordicity === 0)
              wordicity = 0.01;
            else if (wordicity === 1)
              wordicity = 0.99;
          }

          logSum += (Math.log(1 - wordicity) - Math.log(wordicity));
          //log(label + "icity of " + word + ": " + wordicity);
        }
        scores[label] = 1 / ( 1 + Math.exp(logSum) );
      }
      return scores;
    };

    Bayes.extractWinner = function (scores) {
      var bestScore = 0;
      var bestLabel = null;
      for (var label in scores) {
        if (scores[label] > bestScore) {
          bestScore = scores[label];
          bestLabel = label;
        }
      }
      return {label: bestLabel, score: bestScore};
    };

    return Bayes;
  })(Bayes || {});

  localStorage.clear();

  var go = function go() {
    var text = document.getElementById("test_phrase").value;
    var scores = Bayes.guess(text);
    var winner = Bayes.extractWinner(scores);
    document.getElementById("test_result").innerHTML = winner.label;
    document.getElementById("test_probability").innerHTML = winner.score;
    console.log(scores);
  };


  chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) { // getting the current tab attr
    var url = tabs[0].url;


      var striptags = require('striptags');
      var fs = require('fs');
      var read = require('node-read');

      read(url, function(err, article, meta) {
        var article = striptags(article.content); //fs.readFileSync(`${__dirname}/../data/test.txt`, 'utf8').toString()
        console.log(article);

        var consTrain = fs.readFileSync(`${__dirname}/../data/conservatives.txt`, 'utf8').toString().split('\n')
        var libTrain = fs.readFileSync(`${__dirname}/../data/liberals.txt`, 'utf8').toString().split('\n')

        consTrain.forEach(function (line) {
          Bayes.train(line, 'conservative')
        });

        libTrain.forEach(function (line) {
          Bayes.train(line, 'liberal')
        });

        var scores = Bayes.guess(article)
        var winner = Bayes.extractWinner(scores)

        $('#result').text(winner.label)
        $('#accuracy').text(winner.score)

        console.log("article classified as : " + winner.label)
        console.log("prediction accuracy : " + winner.score)

        var notifOptions = {
          type: "basic",
          iconUrl: "images/icon-16.png",
          title: "Prediction Result",
          message: "Classified Article as "+ winner.label
        };
        chrome.notifications.create('predictNotif', notifOptions);

        chrome.storage.sync.set({'label': winner.label});
        chrome.storage.sync.set({'accuracy': winner.score });

      });


  });


})();

console.log('bias-detector.js -- End');