'''
Article Scraper script to extract the article contents
and save them into text file
Libraries used:
Newspaper3K => http://newspaper.readthedocs.io/en/latest/
Langdetect => https://pypi.org/project/langdetect/
'''
import newspaper
from newspaper import Article
from langdetect import detect

def getArticle(url):
    #url ='http://money.cnn.com/2018/06/04/technology/apple-tim-cook-screen-time/index.html'
    article = Article(url, memoize_articles=False, language='en')
    article.download()
    article.parse()
    if article.download_state ==2 :
        if detect(article.text) == 'en':
            f = open("article.txt", "w+", encoding='utf-8')
            f.write(str(url) + "\n")
            f.write(str(article.authors) + "\n")
            f.write(str(article.publish_date) + "\n")
            f.write(str(article.title) + "\n \n")
            f.write(article.text)
            f.close()


# for each article, retrieve the content and save in text file
def getAllArticles(url, fileName):
    #huffPost = 'https://www.huffingtonpost.com/section/politics'
    #salon = 'https://www.salon.com'
    #conservTribune = 'https://www.westernjournal.com/ct/'
    #beitbart = 'http://www.breitbart.com/'
    #westernJ = 'https://www.westernjournal.com/'

    cnt = 0
    papers = newspaper.build(url, memoize_articles=False)
    #print(papers.size())
    for article in papers.articles:
        url = article.url
        a = Article(url)
        a.download()

        if a.download_state == 2:   # if article has been successfully downloaded
            a.parse()
            if str(a.authors) != "[]" and str(a.publish_date) != "None": # if author & date is missing
                if detect(a.text) == "en": # if the article is in english
                    cnt = cnt + 1
                    if(cnt>=0):
                        f = open(fileName + str(cnt)+".txt", "w+" , encoding='utf-8')
                        f.write(str(url) + "\n")
                        f.write(str(a.authors) + "\n")
                        f.write(str(a.publish_date) + "\n")
                        f.write(str(a.title) + "\n \n")
                        f.write(a.text)
                        f.close()



def getAllCategories(): # print all Categories
    papers = newspaper.build('http://www.townhall.com', memoize_articles=False)
    for category in papers.category_urls():
       print(category)


def getAllURLs(): # print all URLs
    i = 0
    papers = newspaper.build('https://nypost.com/news/', memoize_articles=False)
    for article in papers.articles:
        print(article.url)



getAllArticles('http://www.townhall.com', 'fileName')
