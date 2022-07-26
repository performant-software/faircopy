import { createConsumer } from '@rails/actioncable';

export function connectCable(projectID, serverURL, authToken, onNotification ) {
    const wsURL = serverURL.replace('http://','ws://')
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
