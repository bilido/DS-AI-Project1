//----------------------------------------------------------------------------
// slantDetector.scala
// Political Slant detector
// Features : NaiveBayes algorithm, TF-IDF Vectors
// dataset repository: https://github.com/bilido/DS-AI-Project1/tree/master/data
//-----------------------------------------------------------------------------

import org.apache.spark.{SparkConf, SparkContext}

import org.apache.spark.mllib.feature.HashingTF
import org.apache.spark.mllib.feature.IDF

import org.apache.spark.mllib.regression.LabeledPoint
import org.apache.spark.mllib.classification.NaiveBayes
import org.apache.spark.mllib.classification.NaiveBayesModel
import org.apache.spark.mllib.evaluation.MulticlassMetrics

import org.apache.log4j.Logger
import org.apache.log4j.Level

object slantDetector {

  def main(args: Array[String]) ={
    Logger.getLogger("org").setLevel(Level.OFF)
    Logger.getLogger("akka").setLevel(Level.OFF)

    val conf = new SparkConf()
    conf.setMaster("local")
    conf.setAppName("Slant Detector")

    val sc = new SparkContext(conf)
    val dataPath = "hdfs://10.4.2.101/user/biliido/DSI/data/*"
    val data = sc.wholeTextFiles(dataPath)

    // split data into training(80%) and test (20%)
    val Array(trainData, testData) = data.randomSplit(Array(0.8, 0.2), seed = 11L)
    /*println( "data: " + data.count())         // 2161
    println( "training: " + trainData.count()) // 1759
    println( "test: " + testData.count())     // 402
    */
    /*val testLabel = testData.map { case (file, content) =>
        val party = file.split("/").takeRight(2).head
            (party, 1)
              }.reduceByKey(_+_).foreach(x => println(x))
    System.exit(0)*/

    val stopWords = sc.textFile("hdfs://10.4.2.101/user/biliido/DSI/stopWords.txt").flatMap(_.split(" ")).collect()
    val regex = """[^0-9]*""".r

    // list of tokens that occur less frequently
    val stopTokens = trainData.flatMap{ case (file, content) => content.split("""\W+""").map(_.toLowerCase)}
      .filter(regex.pattern.matcher(_).matches) // take out numbers
      .map((_,1)).reduceByKey(_ + _)
      .filter{ case (key, value) => value < 2}
      .map { case (key, value) => key}.collect.toSet

    def documentTokenizer(doc: String): Seq[String] = { // tokenize each document
      val result = doc.split("""\W+""").map(_.toLowerCase)
        .filter(regex.pattern.matcher(_).matches())
        .filter(!stopWords.contains(_))
        .filter(!stopTokens.contains(_))
        .filter(_.size >= 2)
      result.toSeq
    }

    val docTokens = trainData.map{case (file, content) =>  documentTokenizer(content)}

    val hashingTF = new HashingTF(math.pow(2, 18).toInt)

    val trainTF = hashingTF.transform(docTokens)
    trainTF.cache()

    val idf = new IDF().fit(trainTF)
    val trainTF_IDF = idf.transform(trainTF)

    val articlesLabels = trainData .map{ case (file, content) => file.split("/").takeRight(2).head } // political parties

    val articlesLabelsMap = articlesLabels.distinct().collect().zipWithIndex.toMap
    val zippedTrain = articlesLabels.zip(trainTF_IDF)
    val train = zippedTrain.map{ case(party, vector)
    => LabeledPoint(articlesLabelsMap(party), vector)  }

    train.cache()

    val NB_model = NaiveBayes.train(train, lambda = 0.1)

    // test Data Preprocessing -----------
    val testLabels = testData.map{ case (file, content) =>
      val party = file.split("/").takeRight(2).head
      articlesLabelsMap(party)
    }

    val testTF = testData.map{ case(file, content) => hashingTF.transform(documentTokenizer(content))  }
    val testTF_IDF = idf.transform(testTF)
    val zippedTest = testLabels.zip(testTF_IDF)

    val test = zippedTest.map{ case(party, vector) =>  LabeledPoint(party, vector) }

    val prediction = test.map{ p => (NB_model.predict(p.features), p.label) }

    val metrics = new MulticlassMetrics(prediction)

    println("METRICS Accuracy == > " + metrics.accuracy)
    //println("METRICS FMeasure == > " + metrics.weightedFMeasure)
    //println("METRICS True Positive == > " + metrics.weightedTruePositiveRate)
    //println("METRICS False Positive == > " + metrics.weightedFalsePositiveRate)
    //println("METRICS LABELS == > " + metrics.labels.deep.mkString(",")) // 0 = > Conservatives, 1 => Liberals
    println("METRICS CONFUSION MATRIX == > \n" + metrics.confusionMatrix + "\n\n")

    NB_model.save(sc, "hdfs://10.4.2.101/user/biliido/DSI/NaiveBayesModel")
    /*
    val labels = metrics.labels
    // Precision by label
    labels.foreach{ l =>  println(s"Precision($l) = " + metrics.precision(l)) }

    // False positive rate by label
    labels.foreach { l =>
      println(s"FPR($l) = " + metrics.falsePositiveRate(l))
    }*/
  }


}
