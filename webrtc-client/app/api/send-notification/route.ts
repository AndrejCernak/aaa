import type { NextApiRequest, NextApiResponse } from 'next'
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'TVOJ_PROJECT_ID',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.body

  const message = {
    token,
    notification: {
      title: '📞 Prichádzajúci hovor',
      body: 'Klikni na „Prijať“ pre spojenie.',
    },
  }

  try {
    await admin.messaging().send(message)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error('FCM error:', error)
    res.status(500).json({ error: 'Failed to send notification' })
  }
}
