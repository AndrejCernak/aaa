import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Inicializuj Firebase Admin len raz
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
    }),
  })
}

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const message = {
    token,
    notification: {
      title: '📞 Prichádzajúci hovor',
      body: 'Niekto ti volá. Klikni pre otvorenie appky.',
    },
    webpush: {
      notification: {
        icon: '/icon-192.png',
        click_action: 'https://TVOJA-VERCEL-ADRESA.vercel.app',
      },
    },
  }

  try {
    await admin.messaging().send(message)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('FCM error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
