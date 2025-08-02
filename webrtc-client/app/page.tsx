'use client'

import { useEffect, useRef, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'

export default function HomePage() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const [myToken, setMyToken] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration)
        })
        .catch((err) => {
          console.error('❌ Service Worker registration failed:', err)
        })
    }

    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('🔔 Notifikácia (foreground):', payload)
        alert('📞 Prichádzajúci hovor!')
      })
    }
  }, [])

  useEffect(() => {
    const ws = new WebSocket('wss://bbb-node.onrender.com')
    socketRef.current = ws

    ws.onmessage = async (message) => {
      const data = JSON.parse(message.data)

      if (data.type === 'call') {
        alert('📞 Dostali ste hovor! Kliknite na „Prijať“ pre spojenie.')
      } else if (data.type === 'offer') {
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

  const requestPushPermission = async () => {
    const permission = await Notification.requestPermission()
    if (permission === 'granted' && messaging) {
      try {
        const token = await getToken(messaging, {
          vapidKey: 'BN5tQV4u5UmSo6E-u3WBgWlYPDQmGraDyGb726t_8jvwl_MtAAjAk1QZ1QrMx6cMJNhy6tJRwIyXsiBKNhsSKhU',
        })
        console.log('✅ FCM token:', token)
        setMyToken(token)
        localStorage.setItem('fcm_token', token)
      } catch (err) {
        console.error('❌ Nepodarilo sa získať FCM token:', err)
      }
    } else {
      console.warn('🔒 Notifikácie nepovolené alebo messaging null.')
    }
  }

  const setupConnection = async (isCaller: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    })

    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.send(JSON.stringify({ type: 'ice', candidate: event.candidate }))
      }
    }

    peerConnection.current = pc

    if (isCaller) {
      const recipientToken = prompt('Zadaj FCM token druhej osoby:')
      if (recipientToken) {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: recipientToken }),
        })
      }

      socketRef.current?.send(JSON.stringify({ type: 'call' }))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current?.send(JSON.stringify({ type: 'offer', offer }))
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    })

    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
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

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 bg-black text-white">
      <h1 className="text-2xl font-bold">WebRTC Hovor</h1>

      <button
        onClick={requestPushPermission}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
      >
        Povoliť upozornenia
      </button>

      <p className="text-sm text-gray-400">
        Tvoj FCM token:
        <br />
        <span className="break-all">{myToken ?? 'Najprv povoľ notifikácie.'}</span>
      </p>

      <div className="flex gap-4">
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          onClick={() => setupConnection(true)}
        >
          Zavolať
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          onClick={() => setupConnection(false)}
        >
          Prijať
        </button>
      </div>

      <div className="flex gap-4 mt-6">
        <div>
          <h2>Lokálne video</h2>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-gray-800" />
        </div>
        <div>
          <h2>Vzdialené video</h2>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-gray-800" />
        </div>
      </div>
    </main>
  )
}
