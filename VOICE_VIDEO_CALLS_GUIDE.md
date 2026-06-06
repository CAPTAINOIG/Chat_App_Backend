# 📞📹 Voice & Video Calls Implementation Guide

## 🚀 **Features Implemented**

✅ **Voice Calls** - High-quality audio calling  
✅ **Video Calls** - Face-to-face video communication  
✅ **Call Management** - Accept, reject, end calls  
✅ **Real-time Signaling** - WebRTC with Socket.io  
✅ **Call History** - Track call logs  
✅ **Media Controls** - Mute, camera toggle, switch camera  
✅ **Connection Status** - Monitor call quality  
✅ **Missed Calls** - Handle offline scenarios  

## 📱 **Frontend Integration**

### 1. Copy the Call Service

```bash
cp frontend-examples/call.service.js src/services/call.service.js
```

### 2. Basic Usage Example

```javascript
import callService from './services/call.service';

// Initiate a voice call
const startVoiceCall = async (receiverId) => {
  try {
    const call = await callService.initiateCall(receiverId, 'voice');
    console.log('Call initiated:', call.callId);
  } catch (error) {
    console.error('Failed to start call:', error.message);
  }
};

// Initiate a video call
const startVideoCall = async (receiverId) => {
  try {
    const call = await callService.initiateCall(receiverId, 'video');
    console.log('Video call initiated:', call.callId);
  } catch (error) {
    console.error('Failed to start video call:', error.message);
  }
};
```

### 3. React Call Component Example

```jsx
import React, { useState, useEffect, useRef } from 'react';
import callService from '../services/call.service';

const CallComponent = ({ currentUserId }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    // Listen for incoming calls
    callService.on('incomingCall', handleIncomingCall);
    callService.on('callAccepted', handleCallAccepted);
    callService.on('callRejected', handleCallRejected);
    callService.on('callEnded', handleCallEnded);
    callService.on('callConnected', handleCallConnected);
    callService.on('localStream', handleLocalStream);
    callService.on('remoteStream', handleRemoteStream);
    callService.on('connectionState', handleConnectionState);

    return () => {
      // Cleanup listeners
      callService.off('incomingCall', handleIncomingCall);
      callService.off('callAccepted', handleCallAccepted);
      callService.off('callRejected', handleCallRejected);
      callService.off('callEnded', handleCallEnded);
      callService.off('callConnected', handleCallConnected);
      callService.off('localStream', handleLocalStream);
      callService.off('remoteStream', handleRemoteStream);
      callService.off('connectionState', handleConnectionState);
    };
  }, []);

  const handleIncomingCall = (call) => {
    setIncomingCall(call);
    setCallStatus('ringing');
  };

  const handleCallAccepted = (data) => {
    setCallStatus('connecting');
    setActiveCall(data);
  };

  const handleCallRejected = () => {
    setCallStatus('rejected');
    setTimeout(() => {
      setCallStatus('idle');
      setActiveCall(null);
      setIncomingCall(null);
    }, 2000);
  };

  const handleCallEnded = () => {
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
      setActiveCall(null);
      setIncomingCall(null);
    }, 2000);
  };

  const handleCallConnected = () => {
    setCallStatus('connected');
  };

  const handleLocalStream = (stream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = stream;
    }
  };

  const handleRemoteStream = (stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
    }
  };

  const handleConnectionState = (state) => {
    console.log('Connection state:', state);
  };

  // Call actions
  const acceptCall = async () => {
    try {
      await callService.acceptCall(incomingCall.callId);
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallStatus('connecting');
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const rejectCall = () => {
    callService.rejectCall(incomingCall.callId);
    setIncomingCall(null);
    setCallStatus('idle');
  };

  const endCall = () => {
    callService.endCall();
    setActiveCall(null);
    setCallStatus('idle');
  };

  const toggleMute = () => {
    const enabled = callService.toggleMicrophone();
    setIsMuted(!enabled);
  };

  const toggleCamera = () => {
    const enabled = callService.toggleCamera();
    setIsCameraOn(enabled);
  };

  const switchCamera = () => {
    callService.switchCamera();
  };

  // Render incoming call modal
  if (incomingCall) {
    return (
      <div className="incoming-call-modal">
        <div className="call-info">
          <img 
            src={incomingCall.callerInfo.profilePicture || '/default-avatar.png'} 
            alt="Caller"
            className="caller-avatar"
          />
          <h3>{incomingCall.callerInfo.username}</h3>
          <p>{incomingCall.callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
        </div>
        <div className="call-actions">
          <button onClick={rejectCall} className="reject-btn">
            📞❌
          </button>
          <button onClick={acceptCall} className="accept-btn">
            📞✅
          </button>
        </div>
      </div>
    );
  }

  // Render active call interface
  if (activeCall || callStatus !== 'idle') {
    const isVideoCall = activeCall?.callType === 'video' || incomingCall?.callType === 'video';
    
    return (
      <div className="active-call">
        <div className="call-header">
          <h3>
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'connected' && 'Connected'}
            {callStatus === 'ended' && 'Call Ended'}
            {callStatus === 'rejected' && 'Call Rejected'}
          </h3>
        </div>

        {isVideoCall && (
          <div className="video-container">
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />
            
            {/* Local video */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
        )}

        {/* Audio elements (always present) */}
        <audio ref={localAudioRef} autoPlay muted />
        <audio ref={remoteAudioRef} autoPlay />

        {callStatus === 'connected' && (
          <div className="call-controls">
            <button 
              onClick={toggleMute}
              className={`control-btn ${isMuted ? 'muted' : ''}`}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {isVideoCall && (
              <>
                <button 
                  onClick={toggleCamera}
                  className={`control-btn ${!isCameraOn ? 'off' : ''}`}
                >
                  {isCameraOn ? '📹' : '📹❌'}
                </button>
                
                <button onClick={switchCamera} className="control-btn">
                  🔄
                </button>
              </>
            )}

            <button onClick={endCall} className="end-call-btn">
              📞❌
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CallComponent;
```

### 4. Call Buttons Component

```jsx
const CallButtons = ({ receiverId, receiverName, isOnline }) => {
  const [isCallServiceReady, setIsCallServiceReady] = useState(false);

  useEffect(() => {
    // Check if call service is ready
    setIsCallServiceReady(!callService.isInCall());
  }, []);

  const initiateVoiceCall = async () => {
    if (!isOnline) {
      alert('User is offline');
      return;
    }

    try {
      await callService.initiateCall(receiverId, 'voice');
    } catch (error) {
      alert('Failed to start call: ' + error.message);
    }
  };

  const initiateVideoCall = async () => {
    if (!isOnline) {
      alert('User is offline');
      return;
    }

    try {
      await callService.initiateCall(receiverId, 'video');
    } catch (error) {
      alert('Failed to start video call: ' + error.message);
    }
  };

  if (!isCallServiceReady) {
    return <p>Already in a call</p>;
  }

  return (
    <div className="call-buttons">
      <button 
        onClick={initiateVoiceCall}
        disabled={!isOnline}
        className="voice-call-btn"
        title={`Voice call ${receiverName}`}
      >
        📞
      </button>
      
      <button 
        onClick={initiateVideoCall}
        disabled={!isOnline}
        className="video-call-btn"
        title={`Video call ${receiverName}`}
      >
        📹
      </button>
    </div>
  );
};
```

### 5. Call History Component

```jsx
import apiService from '../services/api.service';

const CallHistory = () => {
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const response = await apiService.get('/user/callHistory');
      setCallHistory(response.data.callHistory);
    } catch (error) {
      console.error('Failed to fetch call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    
    if (hrs > 0) {
      return `${hrs}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call) => {
    const icons = {
      voice: '📞',
      video: '📹',
    };
    
    const statusIcons = {
      missed: '📵',
      rejected: '❌',
      ended: '✅',
    };

    return `${icons[call.callType]} ${statusIcons[call.status] || ''}`;
  };

  if (loading) return <div>Loading call history...</div>;

  return (
    <div className="call-history">
      <h3>Call History</h3>
      {callHistory.length === 0 ? (
        <p>No calls yet</p>
      ) : (
        <div className="call-list">
          {callHistory.map((call) => (
            <div key={call.callId} className={`call-item ${call.status}`}>
              <div className="call-icon">
                {getCallIcon(call)}
              </div>
              <div className="call-info">
                <p className="call-type">
                  {call.isIncoming ? 'Incoming' : 'Outgoing'} {call.callType}
                </p>
                <p className="call-status">{call.status}</p>
                {call.duration > 0 && (
                  <p className="call-duration">{formatDuration(call.duration)}</p>
                )}
              </div>
              <div className="call-time">
                {new Date(call.startTime).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 🎨 **CSS Styles**

```css
/* Incoming Call Modal */
.incoming-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.call-info {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.caller-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 1rem;
}

.call-actions {
  display: flex;
  gap: 2rem;
}

.accept-btn, .reject-btn {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.accept-btn {
  background: #28a745;
  color: white;
}

.reject-btn {
  background: #dc3545;
  color: white;
}

/* Active Call Interface */
.active-call {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.call-header {
  padding: 1rem;
  text-align: center;
  color: white;
  background: rgba(0, 0, 0, 0.5);
}

.video-container {
  flex: 1;
  position: relative;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 150px;
  height: 100px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid white;
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.5);
}

.control-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.control-btn.muted, .control-btn.off {
  background: rgba(220, 53, 69, 0.8);
}

.end-call-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: #dc3545;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

/* Call Buttons */
.call-buttons {
  display: flex;
  gap: 0.5rem;
}

.voice-call-btn, .video-call-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #007bff;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.voice-call-btn:disabled, .video-call-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Call History */
.call-history {
  padding: 1rem;
}

.call-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.call-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.call-item.missed {
  border-left: 4px solid #dc3545;
}

.call-item.ended {
  border-left: 4px solid #28a745;
}

.call-icon {
  font-size: 20px;
  margin-right: 1rem;
}

.call-info {
  flex: 1;
}

.call-time {
  font-size: 12px;
  color: #666;
}
```

## 📱 **Mobile Optimization**

```css
@media (max-width: 768px) {
  .local-video {
    width: 100px;
    height: 75px;
    top: 10px;
    right: 10px;
  }
  
  .call-controls {
    padding: 1rem;
  }
  
  .control-btn {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}
```

## 🔧 **Configuration Options**

### Environment Variables
```env
# Add to your frontend .env
VITE_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
VITE_TURN_SERVER_URL=turn:your-turn-server.com
VITE_TURN_USERNAME=username
VITE_TURN_CREDENTIAL=password
```

### Custom STUN/TURN Servers
```javascript
// In call.service.js, update rtcConfig
this.rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:your-turn-server.com',
      username: 'your-username',
      credential: 'your-password'
    }
  ],
};
```

## 🚀 **Testing**

1. **Open two browser tabs** with different users
2. **Initiate a voice call** from one tab
3. **Accept the call** in the other tab
4. **Test controls**: mute, unmute, end call
5. **Try video calls** and test camera controls
6. **Check call history** after calls end

## 📋 **API Endpoints**

### Call History
```
GET /api/user/callHistory
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "callHistory": [
      {
        "callId": "call_123",
        "callType": "video",
        "status": "ended",
        "isIncoming": true,
        "duration": 120000,
        "startTime": "2025-01-01T12:00:00Z"
      }
    ]
  }
}
```

## 🔒 **Security & Privacy**

1. **Media Permissions**: Always request user consent
2. **HTTPS Required**: WebRTC requires HTTPS in production
3. **TURN Servers**: Use authenticated TURN servers
4. **Call Logs**: Store minimal call metadata
5. **End-to-End**: WebRTC provides peer-to-peer encryption

## 🎯 **Next Steps**

1. Copy the call service to your frontend
2. Integrate call components into your chat UI
3. Test voice and video calls
4. Add call buttons to user profiles
5. Implement call history page
6. Set up TURN servers for production
7. Add push notifications for missed calls

**Your users can now make voice and video calls seamlessly! 📞📹🎉**