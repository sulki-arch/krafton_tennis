/**
 * 크래프톤 테니스 동호회 - Firebase Cloud Functions
 * 
 * 트리거: _notifs/{userId}/{notifId} 생성 시
 * 동작: 해당 유저의 FCM 토큰을 읽어 푸시 알림 전송
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendPushOnNotif = functions
  .region('asia-southeast1')
  .database.ref('_notifs/{userId}/{notifId}')
  .onCreate(async (snapshot, context) => {
    const { userId, notifId } = context.params;
    const data = snapshot.val();

    if (!data || data.read) return null;

    const tokenSnap = await admin.database()
      .ref(`_fcmTokens/${userId}`)
      .once('value');
    const token = tokenSnap.val();

    if (!token) {
      console.log(`[FCM] userId=${userId} 토큰 없음 — 스킵`);
      return null;
    }

    const message = {
      token,
      notification: {
        title: '테니스 동호회',
        body: data.message || '새 알림이 있습니다.',
      },
      data: { notifId, evId: data.evId || '', userId },
      android: {
        notification: { icon: 'ic_notification', color: '#2e7d32', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      webpush: {
        notification: {
          icon: 'https://krafton-tennis.web.app/icon-192.png',
          badge: 'https://krafton-tennis.web.app/icon-192.png',
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: 'https://krafton-tennis.web.app/' },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`[FCM] 전송 성공 → userId=${userId}, messageId=${response}`);
      return null;
    } catch (err) {
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        console.warn(`[FCM] 무효 토큰 제거 → userId=${userId}`);
        await admin.database().ref(`_fcmTokens/${userId}`).remove();
      } else {
        console.error('[FCM] 전송 실패:', err);
      }
      return null;
    }
  });
