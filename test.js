const osjson = require('./onesignal.json') //(with path)
const OneSignal = require('onesignal-node')

console.log('Test ediliyor...')
var osClient = new OneSignal.Client(osjson)
var notification = new OneSignal.Notification({})
notification.postBody['url'] = 'http://bilgisayar.kocaeli.edu.tr/duyurular.php'
notification.postBody['headings'] = { en: 'Test edildin!' }
notification.postBody['contents'] = {
	en: 'Dostum, sistemi şu an test ediyoruz. Bu duyuruyu dikkate alma, olur mu?'
}
notification.postBody['included_segments'] = ['Test Users']
osClient.sendNotification(notification)
