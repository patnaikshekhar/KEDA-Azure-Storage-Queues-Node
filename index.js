const azqueue = require('@azure/storage-queue')

// Get the connection string environment variable from the secret
const CONNECTION_STRING = process.env.CONNECTION_STRING
const QUEUE_NAME = process.env.QUEUE_NAME

async function run() {

  const [accountName, accountKey] = parseConnectionString(CONNECTION_STRING)
  
  const sharedKeyCredential = new azqueue.SharedKeyCredential(
    accountName, 
    accountKey)
  
  const pipeline = azqueue.StorageURL.newPipeline(sharedKeyCredential)
  
  const serviceURL = new azqueue.ServiceURL(
    `https://${accountName}.queue.core.windows.net`,
    pipeline)
  
  const queueURL = azqueue.QueueURL.fromServiceURL(serviceURL, QUEUE_NAME)
  const messagesURL = azqueue.MessagesURL.fromQueueURL(queueURL)
  
  while(1) {
    console.log('Waiting for message')
    const dequeueResponse = await messagesURL.dequeue(azqueue.Aborter.None)
    if (dequeueResponse.dequeuedMessageItems.length >= 1) {
      dequeueResponse.dequeuedMessageItems.forEach(async message => {
        console.log(`Message from queue ${message.messageText}`)
        
        // Delete message
        const messageIdURL = azqueue.MessageIdURL.fromMessagesURL(
          messagesURL, message.messageId)
        await messageIdURL.delete(azqueue.Aborter.none, message.popReceipt)
      })
    } else {
      await waitFor(15)
    }
  }
}

function parseConnectionString(connectionString) {
  const elements = connectionString.split(';')
  const connection = {}
  
  elements.forEach(element => {
    const kv = element.split('=')
    connection[kv[0]] = kv[1]
  }, {})

  return [connection['AccountName'], connection['AccountKey']]
}

function waitFor(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, seconds * 1000)
  })
}

// Invoke the main function
run()
  .then(() => console.log('Completed'))
  .catch(e => console.error(e))

