import { createConsumer } from '@rails/actioncable';

export function connectCable(projectID, serverURL, authToken, onNotification ) {
    const actionCable = createConsumer(`${serverURL}/api/cable?token=${authToken}`)
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
