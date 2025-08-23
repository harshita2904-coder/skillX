import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import BackButton from '../components/BackButton';
import { apiGet } from '../utils/api.js';
import io from 'socket.io-client';

const API_BASE = 'https://skillx-production-5d56.up.railway.app';

const Video = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [banner, setBanner] = useState(null);
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef();
  const socketRef = useRef();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchMatchData();
    initializeVideo();
    initSocket();
    checkActiveSession();
    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (peerConnection.current) peerConnection.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [matchId, user]);

  const checkActiveSession = async () => {
    try {
      const res = await apiGet(`${API_BASE}/sessions/active/${matchId}`);
      if (res.ok) {
        const s = await res.json();
        setActiveSession(s);
        // Don't show banner automatically - let user decide
      } else {
        // No active session - don't show banner, just let user use the main button
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
      setActiveSession(null);
    }
  };

  const initSocket = () => {
    const socket = io('https://skillx-production-5d56.up.railway.app', { auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;
    
    // Add connection status debugging
    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Don't show banner for connection errors - let user try again
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    socket.emit('join-room', matchId);
    console.log('Joined room:', matchId);

    socket.on('call-invited', ({ fromUserId }) => {
      console.log('call-invited received from:', fromUserId);
      if (fromUserId !== user._id) {
        setBanner({ type: 'incoming', text: 'Incoming call. Join the session?', action: () => startCall(true) });
      }
    });

    socket.on('call-joined', ({ fromUserId }) => {
      console.log('call-joined received from:', fromUserId, 'isCallActive:', isCallActive);
      if (fromUserId !== user._id) {
        // Someone joined our call, send them our offer
        console.log('Sending offer to joined user');
        ensurePeerConnection().then(async () => {
          try {
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit('video-offer', { matchId, offer });
            console.log('Offer sent to joined user');
          } catch (error) {
            console.error('Error creating offer:', error);
          }
        }).catch(error => {
          console.error('Error ensuring peer connection:', error);
        });
      }
    });

    socket.on('video-offer', async ({ offer }) => {
      console.log('video-offer received');
      try {
        await ensurePeerConnection();
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('video-answer', { matchId, answer });
        console.log('Answer sent');
      } catch (e) { 
        console.error('Error handling offer', e);
        setBanner({ type: 'error', text: 'Failed to establish connection. Please try again.' });
      }
    });

    socket.on('video-answer', async ({ answer }) => {
      console.log('video-answer received');
      try { 
        if (peerConnection.current) { 
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('Remote description set successfully');
        } 
      }
      catch (e) { 
        console.error('Error setting remote answer', e);
        setBanner({ type: 'error', text: 'Failed to complete connection.' });
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('ice-candidate received');
      try { 
        if (peerConnection.current && candidate) { 
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added');
        } 
      }
      catch (e) { 
        console.error('Error adding ICE candidate', e); 
      }
    });
  };

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Handle remote stream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Remote stream state changed, setting video element');
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play()
        .then(() => {
          console.log('Remote video started from state change');
          // Check video display after a delay
          setTimeout(() => {
            if (remoteVideoRef.current && (remoteVideoRef.current.videoWidth === 0 || remoteVideoRef.current.videoHeight === 0)) {
              console.log('Video not displaying properly, showing fallback');
              const fallback = document.getElementById('video-fallback');
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }
          }, 2000);
        })
        .catch(e => {
          console.error('Remote video play error from state:', e);
          // Try again with a delay
          setTimeout(() => {
            if (remoteVideoRef.current && remoteStream) {
              remoteVideoRef.current.play().catch(e2 => console.error('Retry from state failed:', e2));
            }
          }, 500);
        });
    } else if (remoteStream && !remoteVideoRef.current) {
      console.log('Remote stream available but video ref not ready, will retry');
      // Retry after a short delay
      setTimeout(() => {
        if (remoteStream && remoteVideoRef.current) {
          console.log('Retrying remote video setup');
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => console.error('Retry setup failed:', e));
        }
      }, 200);
    }
  }, [remoteStream]);

  const fetchMatchData = async () => {
    try {
      const res = await apiGet(`${API_BASE}/matches/${matchId}`);
      if (res.ok) setMatchData(await res.json());
    } catch (error) { console.error('Error fetching match data:', error); }
    finally { setLoading(false); }
  };

  const ensurePeerConnection = async () => {
    if (peerConnection.current) {
      console.log('Peer connection already exists');
      return;
    }
    
    console.log('Creating new peer connection');
    const configuration = { 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ] 
    };
    
    peerConnection.current = new RTCPeerConnection(configuration);
    
    // Add connection state debugging
    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state changed:', peerConnection.current.connectionState);
      if (peerConnection.current.connectionState === 'connected') {
        console.log('WebRTC connection established!');
        setBanner({ type: 'success', text: 'Connected successfully!' });
        setTimeout(() => setBanner(null), 3000); // Clear success banner after 3 seconds
      } else if (peerConnection.current.connectionState === 'failed') {
        console.log('WebRTC connection failed');
        setBanner({ type: 'error', text: 'Connection failed. Please try again.' });
      }
    };
    
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current.iceConnectionState);
      if (peerConnection.current.iceConnectionState === 'connected') {
        console.log('ICE connection established!');
      } else if (peerConnection.current.iceConnectionState === 'failed') {
        console.log('ICE connection failed');
      }
    };
    
    if (localStream) {
      console.log('Adding local stream tracks to peer connection');
      localStream.getTracks().forEach(track => { 
        peerConnection.current.addTrack(track, localStream);
        console.log('Added track:', track.kind, track.id);
      });
    } else {
      console.warn('No local stream available when creating peer connection');
    }
    
    peerConnection.current.ontrack = (event) => {
      console.log('Remote track received:', event.streams[0]);
      console.log('Remote tracks:', event.track.kind, event.track.id);
      
      // Set the remote stream immediately
      setRemoteStream(event.streams[0]);
      
      // Wait a bit for the video element to be available, then set it
      setTimeout(() => {
        if (remoteVideoRef.current) {
          console.log('Setting remote video srcObject');
          remoteVideoRef.current.srcObject = event.streams[0];
          
          // Force play the video
          remoteVideoRef.current.play()
            .then(() => console.log('Remote video playing successfully'))
            .catch(e => {
              console.error('Remote video play error:', e);
              // Try again after a short delay
              setTimeout(() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(e2 => console.error('Retry play failed:', e2));
                }
              }, 1000);
            });
        } else {
          console.warn('Remote video ref still not available after delay');
        }
      }, 100); // Small delay to ensure video element is ready
    };
    
    peerConnection.current.onicecandidate = (e) => { 
      if (e.candidate) {
        console.log('Sending ICE candidate:', e.candidate.type);
        socketRef.current.emit('ice-candidate', { matchId, candidate: e.candidate }); 
      } else {
        console.log('ICE gathering completed');
      }
    };
    
    console.log('Peer connection created successfully');
  };

  const initializeVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {}); 
      }
      setCameraError(false);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setCameraError(true);
      // Don't show banner for camera errors - just show in UI
      return null;
    }
  };

  const startCall = async (asCallee = false) => {
    try {
      console.log('startCall called with asCallee:', asCallee);
      
      // Clear any existing banners first
      setBanner(null);
      
      // Ensure we have local stream before proceeding
      if (!localStream) {
        console.log('No local stream, initializing video...');
        const stream = await initializeVideo();
        if (!stream) {
          setBanner({ 
            type: 'error', 
            text: 'Camera access required. Please allow camera/microphone permissions and try again.',
            action: () => startCall(asCallee) // Retry button
          });
          return;
        }
      }
      
      // Start session if not callee
      if (!asCallee) {
        const res = await api('/sessions/start', { method: 'POST', body: JSON.stringify({ matchId }) });
        if (res.status === 400) {
          const data = await res.json();
          setActiveSession(data.session || null);
          setBanner({ type: 'warning', text: data.message });
          return;
        }
        if (!res.ok) {
          setBanner({ type: 'error', text: 'Failed to start session. Please try again.' });
          return;
        }
        const { session } = await res.json();
        setActiveSession(session);
      }
      
      await ensurePeerConnection();
      console.log('Peer connection ensured');
      
      if (!asCallee) {
        // Caller: send invite and create offer
        console.log('Sending call-invite as caller');
        if (socketRef.current.connected) {
          socketRef.current.emit('call-invite', { matchId });
          socketRef.current.emit('video-call-started', { matchId }); // Notify other users
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
          socketRef.current.emit('video-offer', { matchId, offer });
          console.log('Offer sent');
        } else {
          console.error('Socket not connected');
          setBanner({ type: 'error', text: 'Connection lost. Please refresh the page.' });
          return;
        }
      } else {
        // Callee: notify that we're joining and wait for offer
        console.log('Sending call-joined as callee');
        if (socketRef.current.connected) {
          socketRef.current.emit('call-joined', { matchId });
          setBanner({ type: 'info', text: 'Joining the session...' });
          
          // Set a timeout to clear the banner if no offer is received
          setTimeout(() => {
            setBanner(prev => {
              if (prev && prev.text === 'Joining the session...') {
                return { type: 'error', text: 'No response from the other user. Please try again.' };
              }
              return prev;
            });
          }, 15000); // 15 seconds timeout
        } else {
          console.error('Socket not connected');
          setBanner({ type: 'error', text: 'Connection lost. Please refresh the page.' });
          return;
        }
      }
      
      setIsCallActive(true);
      setBanner(null);
    } catch (error) {
      console.error('Error starting call:', error);
      setBanner({ type: 'error', text: 'Could not start the call.' });
    }
  };

  const endCall = async () => {
    if (peerConnection.current) peerConnection.current.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    setIsCallActive(false);
    setRemoteStream(null);
    
    // Emit video call end event
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('video-call-end', { matchId });
    }
    
    if (activeSession) await api('/sessions/end', { method: 'POST', body: JSON.stringify({ sessionId: activeSession._id }) });
    setActiveSession(null);
    navigate('/matches');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!audioTrack.enabled); }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoOff(!videoTrack.enabled); }
    }
  };

  const debugConnection = () => {
    console.log('=== DEBUG CONNECTION ===');
    console.log('Local stream:', localStream ? 'Available' : 'Not available');
    if (localStream) {
      console.log('Local tracks:', localStream.getTracks().map(t => `${t.kind}:${t.id}`));
    }
    console.log('Remote stream:', remoteStream ? 'Available' : 'Not available');
    if (remoteStream) {
      console.log('Remote tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.id}`));
    }
    console.log('Peer connection:', peerConnection.current ? 'Exists' : 'Not exists');
    if (peerConnection.current) {
      console.log('Connection state:', peerConnection.current.connectionState);
      console.log('ICE connection state:', peerConnection.current.iceConnectionState);
      console.log('Signaling state:', peerConnection.current.signalingState);
      console.log('Local description:', peerConnection.current.localDescription?.type);
      console.log('Remote description:', peerConnection.current.remoteDescription?.type);
    }
    console.log('Socket connected:', socketRef.current?.connected);
    console.log('Is call active:', isCallActive);
    console.log('Active session:', activeSession);
    
    // Check video element
    if (remoteVideoRef.current) {
      console.log('Remote video element exists');
      console.log('Video srcObject:', remoteVideoRef.current.srcObject ? 'Set' : 'Not set');
      console.log('Video readyState:', remoteVideoRef.current.readyState);
      console.log('Video paused:', remoteVideoRef.current.paused);
      console.log('Video currentTime:', remoteVideoRef.current.currentTime);
      console.log('Video videoWidth:', remoteVideoRef.current.videoWidth);
      console.log('Video videoHeight:', remoteVideoRef.current.videoHeight);
      
      // Check if video is actually playing
      if (remoteVideoRef.current.videoWidth === 0 || remoteVideoRef.current.videoHeight === 0) {
        console.log('⚠️ Video dimensions are 0 - video not displaying properly');
        // Show fallback
        const fallback = document.getElementById('video-fallback');
        if (fallback) {
          fallback.style.display = 'flex';
        }
      } else {
        console.log('✅ Video dimensions are good - video should be visible');
        // Hide fallback
        const fallback = document.getElementById('video-fallback');
        if (fallback) {
          fallback.style.display = 'none';
        }
      }
    } else {
      console.log('Remote video element not found');
    }
    console.log('========================');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading video call...</p>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-4">Match not found</h2>
          <BackButton to="/matches" text="Back to Matches" className="bg-gray-700 hover:bg-gray-600 text-white" />
        </div>
      </div>
    );
  }

  const otherUser = matchData.user1._id === user._id ? matchData.user2 : matchData.user1;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <BackButton to="/matches" text="Back to Matches" className="mr-4 bg-gray-700 hover:bg-gray-600 text-white" />
              <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold text-white">{otherUser.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-medium text-white">{otherUser.name}</h1>
                <p className="text-sm text-gray-400">Video Call</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isCallActive ? 'bg-green-100 text-green-800' : activeSession ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isCallActive ? 'bg-green-500' : activeSession ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                {isCallActive ? 'Connected' : activeSession ? 'Session Active' : 'Ready'}
              </span>
              {activeSession && !isCallActive && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Call
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`bg-${
          banner.type === 'error' ? 'red' : 
          banner.type === 'warning' ? 'yellow' : 
          banner.type === 'success' ? 'green' : 
          'indigo'
        }-600`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-white flex items-center justify-between">
            <span>{banner.text}</span>
            {banner.action && (
              <button onClick={banner.action} className="ml-4 bg-white text-gray-900 px-3 py-1 rounded-md text-sm">
                {banner.text.includes('Camera access') ? 'Retry' : 'Join'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          {/* Remote Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video shadow-2xl">
            {remoteStream ? (
              <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                  muted={false}
                className="w-full h-full object-cover"
                  onLoadedMetadata={() => console.log('Remote video loaded')}
                  onCanPlay={() => console.log('Remote video can play')}
                  onPlay={() => console.log('Remote video started playing')}
                  onError={(e) => console.error('Remote video error:', e)}
                  style={{ display: 'block' }}
                />
                {/* Fallback if video doesn't show */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50" style={{ display: 'none' }} id="video-fallback">
                  <div className="text-center text-white">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">Connected to {otherUser.name}</p>
                    <p className="text-sm">Video stream received</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <svg className="mx-auto h-20 w-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xl font-medium mb-2">
                    {activeSession ? 'Ready to join the call' : 'Ready to start a call'}
                  </p>
                  <p className="text-sm">
                    {activeSession 
                      ? `Click "Join Call" to connect with ${otherUser.name}`
                      : `Click "Start Call" to begin your skill swap session with ${otherUser.name}`
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Show connection status overlay */}
            {isCallActive && remoteStream && (
              <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>CONNECTED</span>
                </div>
              </div>
            )}
          </div>

          {/* Local Video */}
          <div className="absolute top-6 right-6 w-64 h-40 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-2xl">
            {cameraError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-xs">Camera Error</p>
                </div>
              </div>
            ) : localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs">Loading camera...</p>
                </div>
              </div>
            )}
            {localStream && (
              <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>LIVE</span>
                </div>
              </div>
            )}
            {cameraError && (
              <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>NO CAMERA</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-4">
            {!isCallActive ? (
              <button
                onClick={() => {
                  if (activeSession) {
                    startCall(true); // Join existing session
                  } else {
                    startCall(false); // Start new session
                  }
                }} 
                className="flex items-center px-8 py-4 bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-lg font-medium">
                  {activeSession ? 'Join Call' : 'Start Call'}
                </span>
              </button>
            ) : (
              <>
                <button onClick={toggleMute} className={`p-5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMuted ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />)}
                  </svg>
                </button>
                <button onClick={toggleVideo} className={`p-5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${isVideoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isVideoOff ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636M5.636 18.364l12.728-12.728" />) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />)}
                  </svg>
                </button>
                <button onClick={endCall} className="p-5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-4">
            <button onClick={() => navigate(`/chat/${matchId}`)} className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition-colors">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Open Chat
            </button>
            <button onClick={() => navigate('/tests')} className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition-colors">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Take Skill Test
            </button>
            <button onClick={debugConnection} className="inline-flex items-center px-4 py-2 bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Debug
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video; 