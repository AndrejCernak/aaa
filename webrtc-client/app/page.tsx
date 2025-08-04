'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs'
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAQJj_0HpQsySQDfYFwlXNQqBph3B6yJ_4",
  authDomain: "tokeny-246df.firebaseapp.com",
  projectId: "tokeny-246df",
  storageBucket: "tokeny-246df.firebasestorage.app",
  messagingSenderId: "410206660442",
  appId: "1:410206660442:web:c6b530a5cf6ec5a9e77563",
  measurementId: "G-QB2EJ0JFZL"
};

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export default function HomePage() {
  const { user, isSignedIn } = useUser()
  const [role, setRole] = useState<'admin' | 'client' | null>(null)
  const [tokensLeft, setTokensLeft] = useState(1) // zatiaľ fixne
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  // 🔹 Po prihlásení zisti rolu používateľa
  useEffect(() => {
    if (user) {
      // Zatiaľ natvrdo podľa emailu
      if (user.primaryEmailAddress?.emailAddress === 'admin@test.com') {
        setRole('admin')
      } else {
        setRole('client')
      }
    }
  }, [user])

  // 🔹 Registrácia FCM tokenu
  useEffect(() => {
    const registerFCM = async () => {
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
            role,
            token
          }))
        }
      }
    }

    registerFCM()

    onMessage(messaging, (payload) => {
      console.log('🔔 Foreground notification:', payload)
      alert(payload.notification?.title || 'Prichádzajúci hovor')
    })
  }, [role])

  // 🔹 WebSocket pripojenie
  useEffect(() => {
    const ws = new WebSocket('wss://bbb-node.onrender.com')
    socketRef.current = ws

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
  }, [])

  // 🔹 WebRTC setup
  const setupConnection = async (isCaller: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.muted = true
      localVideoRef.current.play()
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play()
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

      // Pošli FCM notifikáciu adminovi
      socketRef.current?.send(JSON.stringify({
        type: 'call-admin',
        message: 'Prichádzajúci hovor od klienta',
        offer
      }))
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.muted = true
      localVideoRef.current.play()
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play()
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

  // 🔹 UI
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
