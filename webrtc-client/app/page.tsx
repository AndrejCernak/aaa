'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs'

export default function HomePage() {
  const { user, isSignedIn } = useUser()
  const [role, setRole] = useState<'admin' | 'client' | null>(null)
  const [tokensLeft, setTokensLeft] = useState(1)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Určenie role
  useEffect(() => {
    if (user) {
      if (user.primaryEmailAddress?.emailAddress === 'admin@test.com') {
        setRole('admin')
      } else {
        setRole('client')
      }
    }
  }, [user])

  // WebSocket + register + FCM
 useEffect(() => {
  if (typeof window === 'undefined' || !role) return

  const ws = new WebSocket('wss://bbb-node.onrender.com')
  socketRef.current = ws

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'register', role }))
    console.log(`📡 Registered as ${role}`)
    // už nevoláme registerFCM() automaticky
  }

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'offer') {
      await handleOffer(data.offer)
    } else if (data.type === 'answer') {
      await handleAnswer(data.answer)
    } else if (data.type === 'ice') {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    }
  }

  return () => ws.close()
}, [role])


  const requestNotifications = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      alert('⚠️ Notifikácie neboli povolené.')
      return
    }

    // Spustíme registráciu FCM
    await registerFCM()
    setNotificationsEnabled(true)
    alert('✅ Notifikácie boli povolené.')
  } catch (err) {
    console.error('Error enabling notifications:', err)
    alert('❌ Nepodarilo sa povoliť notifikácie.')
  }
}

// FCM registrácia
const registerFCM = async () => {
  const { initializeApp } = await import('firebase/app')
  const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

  const firebaseConfig = {
    apiKey: "AIzaSyAQJj_0HpQsySQDfYFwlXNQqBph3B6yJ_4",
    authDomain: "tokeny-246df.firebaseapp.com",
    projectId: "tokeny-246df",
    storageBucket: "tokeny-246df.firebasestorage.app",
    messagingSenderId: "410206660442",
    appId: "1:410206660442:web:c6b530a5cf6ec5a9e77563",
    measurementId: "G-QB2EJ0JFZL"
  }

  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const token = await getToken(messaging, {
      vapidKey: 'BN5tQV4u5UmSo6E-u3WBgWlYPDQmGraDyGb726t_8jvwl_MtAAjAk1QZ1QrMx6cMJNhy6tJRwIyXsiBKNhsSKhU',
      serviceWorkerRegistration: registration,
    })

    if (token) {
      console.log('✅ FCM token:', token)
      socketRef.current?.send(JSON.stringify({
        type: 'fcm-token',
        token
      }))
    } else {
      console.warn('⚠️ No FCM token received – user may have denied permission.')
    }
  }

  onMessage(messaging, (payload) => {
    console.log('🔔 Foreground notification:', payload)
    alert(payload.notification?.title || 'Prichádzajúci hovor')
  })
}

  // Setup WebRTC connection
  const setupConnection = async (isCaller: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.muted = true
      await localVideoRef.current.play()
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play().catch(() => {})
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.send(JSON.stringify({ type: 'ice', candidate: event.candidate }))
      }
    }

    peerConnection.current = pc

    if (isCaller) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current?.send(JSON.stringify({
        type: 'offer',
        offer
      }))
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.muted = true
      await localVideoRef.current.play()
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play().catch(() => {})
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.send(JSON.stringify({ type: 'ice', candidate: event.candidate }))
      }
    }

    peerConnection.current = pc
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socketRef.current?.send(JSON.stringify({ type: 'answer', answer }))
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  // UI
  if (!isSignedIn) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <h1 className="text-2xl">WebRTC PWA</h1>
        <SignInButton />
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
      <h1 className="text-2xl">Vitaj {role === 'admin' ? 'Poradca' : 'Klient'}</h1>
      <SignOutButton />

      {role === 'client' && (
        <div>
          <p>Zostatok tokenov: {tokensLeft}</p>
          <button
            disabled={tokensLeft <= 0}
            onClick={() => setupConnection(true)}
            className="bg-green-600 px-4 py-2 rounded disabled:opacity-50"
          >
            Zavolať
          </button>
        </div>
      )}

      {role === 'admin' && (
        <button onClick={() => setupConnection(false)} className="bg-blue-600 px-4 py-2 rounded">
          Prijať
        </button>
      )}

{!notificationsEnabled && (
  <button
    onClick={requestNotifications}
    className="bg-yellow-500 px-4 py-2 rounded"
  >
    Povoliť notifikácie
  </button>
)}
      <div className="flex gap-4 mt-4">
        <div>
          <h2>Lokálne video</h2>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-gray-700" />
        </div>
        <div>
          <h2>Vzdialené video</h2>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-gray-700" />
        </div>
      </div>
    </main>
  )
}
