const Telegraf = require('telegraf')
const session = require('telegraf/session')
let Crawler = require('crawler')
const osjson = require('./onesignal.json')
const jsdom = require('jsdom')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const OneSignal = require('onesignal-node')
const CronJob = require('cron').CronJob
const { JSDOM } = jsdom
const db = low(new FileSync('db.json'))
const c = new Crawler()
const bot = new Telegraf('')

// Register session middleware
bot.use(session())

var osClient = new OneSignal.Client(osjson)

hashCode = function (s) {
  let h = 0,
    l = s.length,
    i = 0
  if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0
  return h.toString()
}

function difference(newArr, oldArr) {
  var helper = []
  var dif = []

  for (var i = 0; i < newArr.length; i++) {
    helper[newArr[i].id] = true
  }

  for (var j = 0; j < oldArr.length; j++) {
    if (helper[oldArr[j].id]) {
      delete helper[oldArr[j].id]
    } else {
      helper[oldArr[j].id] = true
    }
  }

  for (var k in helper) {
    dif.push(newArr.find((e) => e.id === k))
  }

  return dif
}

function newNode(item) {
  // oh no, is it jQuery? NO.
  $ = (query) => {
    return item.querySelector(query) ? item.querySelector(query).innerHTML : ''
  }

  let itemDate = $('.modal-body dd:nth-child(2)')
  let itemTitle = $('.modal-title')
  let itemBody = $('.modal-body dd:nth-child(4)')
  let itemAttachment = item.querySelector('.modal-body a.btn')

  // we need hash for "unique" rows (for removing duplicates later on).
  let itemHash = hashCode(itemTitle + itemDate)

  return {
    id: itemHash,
    date: itemDate,
    title: itemTitle,
    body: itemBody,
    attachment: itemAttachment
      ? 'http://bilgisayar.kocaeli.edu.tr/' +
        itemAttachment.href.replace(
          'href="upload/',
          'href="http://bilgisayar.kocaeli.edu.tr/upload/'
        )
      : '',
  }
}

function newNotification(arr, iteration = 0) {
  if (arr.length === 0) {
    return
  }

  console.log('Yollanıyor')
  // we need to create a notification to send
  var notification = new OneSignal.Notification({})
  let attachment = arr[0].attachment
    ? arr[0].attachment
    : 'http://bilgisayar.kocaeli.edu.tr/duyurular.php'
  // send the first notification in the array
  notification.postBody['url'] = attachment
  notification.postBody['headings'] = { en: arr[0].title }
  notification.postBody['contents'] = { en: arr[0].body }
  notification.postBody['included_segments'] = ['Subscribed Users']

  function escapeText(str) {
    return str
  }

  bot.telegram.sendMessage(
    '@kou_duyuru',
    `<b>${escapeText(arr[0].title)}</b>
${escapeText(arr[0].body)}` +
      (arr[0].attachment
        ? `
<a href="${escapeText(arr[0].attachment)}">Link</a>`
        : ``),
    {
      parse_mode: 'HTML',
    }
  )

  osClient.sendNotification(notification, function (err, httpResponse, data) {
    if (err) {
      console.log('Bildirim gönderilemedi, tekrar deneniyor...', iteration)
      if (iteration < 10) {
        // wait and try again
        setTimeout(function () {
          newNotification(arr, iteration + 1)
        }, 10000)
      } else {
        console.log('Valla 10 kere denedim, gönderemedim.')
      }
    } else {
      // notifiation sent successfully.
      console.log(data, httpResponse.statusCode)

      // if there are more than one notification, remove sent from list and send others.
      if (arr.length > 1) {
        setTimeout(function () {
          newNotification(arr.slice(1))
        }, 30000)
      }
    }
  })
}

function sendRequest() {
  console.log('Kontrol ediliyor...', new Date().toString())
  c.queue([
    {
      uri: 'http://bilgisayar.kocaeli.edu.tr/duyurular.php',
      jQuery: false, // just because

      callback: function (error, res, done) {
        if (error) {
          // something went wrong while connecting
          console.log(error)
        } else {
          // create new DOM and select "genel duyurular"
          let genelDuyurular = new JSDOM(
            res.body
          ).window.document.querySelectorAll('.modal')

          // if db isn't created, crete one
          db.defaults({ records: [] }).write()

          const oldDB = db.get('records').value().slice(0)

          // create new db on ram
          const newDB = db.get('records').value()

          for (i = 0; i < genelDuyurular.length; i++) {
            // push all items to it
            newDB.push(newNode(genelDuyurular[i]))
          }

          // and write to file
          db.set('records', newDB).write()

          // finally, remove duplicates
          const uniqueDB = db.get('records').uniqBy('id').value()

          db.set('records', uniqueDB).write()

          newNotification(difference(uniqueDB, oldDB))
        }

        // finish this nonsense
        done()
      },
    },
  ])
}

console.log('Çalışmaya başladım!')
sendRequest()
bot.launch()

new CronJob('0 */5 * * * *', sendRequest, null, true)
