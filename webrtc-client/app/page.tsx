'use client'

import { useEffect, useRef, useState } from 'react'

export default function HomePage() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  const socketRef = useRef<WebSocket | null>(null)

useEffect(() => {
  const ws = new WebSocket('wss://bbb-node.onrender.com')
  socketRef.current = ws

  ws.onmessage = async (message) => {
    const data = JSON.parse(message.data)

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
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
})


  const setupConnection = async (isCaller: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Google STUN server
      ]
    })

    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.send(JSON.stringify({ type: 'ice', candidate: event.candidate }))
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState)
    }

    peerConnection.current = pc

    if (isCaller) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket?.send(JSON.stringify({ type: 'offer', offer }))
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ]
    })

    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.send(JSON.stringify({ type: 'ice', candidate: event.candidate }))
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state (receiver):', pc.iceConnectionState)
    }

    peerConnection.current = pc

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socket?.send(JSON.stringify({ type: 'answer', answer }))
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 bg-black text-white">
      <h1 className="text-2xl font-bold">WebRTC Hovor</h1>
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
