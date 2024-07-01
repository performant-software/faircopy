import { createConsumer } from '@rails/actioncable';

export function connectCable(projectID, serverURL, authToken, onNotification ) {
    const wsURL = getWebSocketURL(serverURL)
    const actionCable = createConsumer(`${wsURL}/api/cable?token=${authToken}`)
    actionCable.subscriptions.create(
        {
          channel: 'NotificationChannel',
          project_id: projectID,
        },
        {
          received(data) {
              onNotification(data)
          }
        }
    )
}

function getWebSocketURL( serverURL ) {
  if( serverURL.includes('http://') ) {
    return serverURL.replace('http://','ws://')
  } else if( serverURL.includes('https://') ) {
    return serverURL.replace('https://','wss://')
  } else {
    return `wss://${serverURL}`
  }
}