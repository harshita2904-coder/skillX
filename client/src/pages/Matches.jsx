import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const Matches = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [groups, setGroups] = useState({ accepted: [], pending: [], outgoing: [], suggestions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoCallNotifications, setVideoCallNotifications] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const socketRef = useRef();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMatches();
    initSocket();
    checkActiveSessions();
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Periodically check for active sessions
    const sessionInterval = setInterval(checkActiveSessions, 10000); // Check every 10 seconds
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(sessionInterval);
    };
  }, [user, navigate]);

  const initSocket = () => {
    const socket = io('http://localhost:4000', { 
      auth: { token: localStorage.getItem('token') } 
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected in Matches page');
    });

    socket.on('video-call-started', ({ matchId, fromUserId, fromUserName }) => {
      console.log('Video call started notification:', { matchId, fromUserId, fromUserName });
      setVideoCallNotifications(prev => [
        ...prev.filter(n => n.matchId !== matchId),
        { matchId, fromUserId, fromUserName, timestamp: Date.now() }
      ]);
      // Mark session as active immediately for inline UI indicator
      setActiveSessions(prev => ({
        ...prev,
        [matchId]: prev[matchId] || { matchId, status: 'active', startedBy: fromUserId }
      }));
      
      // Play notification sound
      playNotificationSound();
      
      // Show browser notification if permission is granted
      if (Notification.permission === 'granted') {
        new Notification('Video Call Request', {
          body: `${fromUserName} is trying to start a video call with you!`,
          icon: '/favicon.ico',
          tag: matchId
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Video Call Request', {
              body: `${fromUserName} is trying to start a video call with you!`,
              icon: '/favicon.ico',
              tag: matchId
            });
          }
        });
      }
    });

    socket.on('video-call-ended', ({ matchId }) => {
      console.log('Video call ended notification:', matchId);
      setVideoCallNotifications(prev => prev.filter(n => n.matchId !== matchId));
      setActiveSessions(prev => {
        const newSessions = { ...prev };
        delete newSessions[matchId];
        return newSessions;
      });
    });

    // Listen for direct notifications (e.g., incoming call) even if not in a specific room
    socket.on('notification', ({ type, matchId, fromUserId }) => {
      if (type !== 'incoming-call') return;
      // Try to resolve caller name from existing groups; fallback to generic label
      let fromUserName = 'Someone';
      try {
        const matchItem = groups.accepted.find(m => m._id === matchId);
        if (matchItem?.user?.name) {
          fromUserName = matchItem.user.name;
        }
      } catch {}

      setVideoCallNotifications(prev => [
        ...prev.filter(n => n.matchId !== matchId),
        { matchId, fromUserId, fromUserName, timestamp: Date.now() }
      ]);
      setActiveSessions(prev => ({
        ...prev,
        [matchId]: prev[matchId] || { matchId, status: 'active', startedBy: fromUserId }
      }));
      playNotificationSound();
      if (Notification.permission === 'granted') {
        new Notification('Video Call Request', {
          body: `${fromUserName} is trying to start a video call with you!`,
          icon: '/favicon.ico',
          tag: matchId
        });
      }
    });
  };

  const checkActiveSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sessions = await response.json();
        const activeSessionsMap = {};
        sessions.forEach(session => {
          if (session.status === 'active') {
            activeSessionsMap[session.matchId] = session;
          }
        });
        setActiveSessions(activeSessionsMap);
      }
    } catch (error) {
      console.error('Error checking active sessions:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/matches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        setError('Failed to fetch matches');
      }
    } catch (error) {
      setError('Error fetching matches');
    } finally {
      setLoading(false);
    }
  };

  const acceptMatch = async (matchId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/matches/accept/${matchId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchMatches();
      }
    } catch (error) {
      console.error('Error accepting match:', error);
    }
  };

  const requestMatch = async (targetUserId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/matches/request/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) fetchMatches();
    } catch (e) {
      console.error('Error requesting match:', e);
    }
  };

  const startChat = (matchId) => {
    navigate(`/chat/${matchId}`);
  };

  const Section = ({ title, items, emptyText, renderActions }) => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'person' : 'people'}</span>
      </div>
      {items.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-gray-500 text-sm">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <div key={item._id || item.user._id || idx} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-indigo-600">
                      {item.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{item.user.name}</h3>
                    <p className="text-sm text-gray-500">{item.user.location}</p>
                  </div>
                  {typeof item.compatibility === 'number' && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.compatibility}% match
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Can teach you:</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.user.skillsTeach.slice(0, 3).map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        {skill}
                      </span>
                    ))}
                    {item.user.skillsTeach.length > 3 && (
                      <span className="text-xs text-gray-500">+{item.user.skillsTeach.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Wants to learn:</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.user.skillsLearn.slice(0, 3).map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {skill}
                      </span>
                    ))}
                    {item.user.skillsLearn.length > 3 && (
                      <span className="text-xs text-gray-500">+{item.user.skillsLearn.length - 3} more</span>
                    )}
                  </div>
                </div>

                {item.user.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.user.bio}</p>
                )}

                <div className="mt-4 flex space-x-2">
                  {renderActions(item)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Skill Matches</h1>
          <p className="text-gray-600">Find people to swap skills with</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Video Call Notifications */}
        {videoCallNotifications.length > 0 && (
          <div className="mb-6">
            {videoCallNotifications.map((notification) => (
              <div key={notification.matchId} className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-3 flex items-center justify-between animate-pulse">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>
                    <strong>{notification.fromUserName}</strong> is trying to start a video call with you!
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setVideoCallNotifications(prev => prev.filter(n => n.matchId !== notification.matchId));
                      navigate(`/video/${notification.matchId}`);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Join Call
                  </button>
                  <button
                    onClick={() => setVideoCallNotifications(prev => prev.filter(n => n.matchId !== notification.matchId))}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Video Call Indicator */}
        {videoCallNotifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse flex items-center">
              <svg className="h-5 w-5 mr-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">{videoCallNotifications.length} Incoming Call{videoCallNotifications.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        <Section
          title="Your Matches"
          items={[...groups.accepted]}
          emptyText="You have no accepted matches yet."
          renderActions={(item) => (
            <>
              <button
                onClick={() => startChat(item._id)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                Start Chat
              </button>
              {activeSessions[item._id] ? (
                <button
                  onClick={() => navigate(`/video/${item._id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center animate-pulse"
                  title="Join Incoming Call"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Call
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/video/${item._id}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                  title="Start Video Call"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </>
          )}
        />

        <Section
          title="Incoming Requests"
          items={[...groups.pending]}
          emptyText="No incoming match requests."
          renderActions={(item) => (
            <>
              <button
                onClick={() => acceptMatch(item._id)}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Accept
              </button>
            </>
          )}
        />

        <Section
          title="Your Requests (Waiting)"
          items={[...groups.outgoing]}
          emptyText="You haven't requested any matches yet."
          renderActions={(item) => (
            <>
              <span className="text-sm text-gray-500">Awaiting their response…</span>
            </>
          )}
        />

        <Section
          title="Other Profiles to Match"
          items={groups.suggestions.map(s => ({ ...s, _id: s.user._id }))}
          emptyText="No suggestions right now. Update your skills to see more."
          renderActions={(item) => (
            <>
              <button
                onClick={() => requestMatch(item.user._id)}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Request Match
              </button>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default Matches; 