import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  })
}

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: '📞 Prichádzajúci hovor',
        body: 'Klikni na „Prijať“ pre spojenie.',
      },
      webpush: {
        notification: {
          icon: '/icon-192.png'
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Chyba pri posielaní notifikácie:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
