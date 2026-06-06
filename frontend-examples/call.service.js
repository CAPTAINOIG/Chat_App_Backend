/**
 * WebRTC Call Service for Frontend
 * Copy this file to your frontend project: src/services/call.service.js
 */

import socketService from './socket.service';

class CallService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.currentCall = null;
    this.isCallActive = false;
    this.callType = null; // 'voice' or 'video'
    
    // WebRTC configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for production
        // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
      ],
    };

    this.setupSocketListeners();
  }

  /**
   * Setup socket event listeners
   */
  setupSocketListeners() {
    // Call events
    socketService.on('call:incoming', this.handleIncomingCall.bind(this));
    socketService.on('call:accepted', this.handleCallAccepted.bind(this));
    socketService.on('call:rejected', this.handleCallRejected.bind(this));
    socketService.on('call:ended', this.handleCallEnded.bind(this));
    socketService.on('call:missed', this.handleCallMissed.bind(this));
    socketService.on('call:error', this.handleCallError.bind(this));

    // WebRTC signaling
    socketService.on('webrtc:offer', this.handleOffer.bind(this));
    socketService.on('webrtc:answer', this.handleAnswer.bind(this));
    socketService.on('webrtc:ice-candidate', this.handleIceCandidate.bind(this));
  }

  /**
   * Initiate a call
   */
  async initiateCall(receiverId, callType = 'voice') {
    try {
      if (this.isCallActive) {
        throw new Error('Already in a call');
      }

      this.callType = callType;
      this.isCallActive = true;

      // Get user media
      await this.getUserMedia(callType === 'video');

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Emit call initiate
      socketService.socket.emit('call:initiate', {
        receiverId,
        callType,
      });

      return new Promise((resolve, reject) => {
        // Set up one-time listeners for call response
        const handleInitiated = (data) => {
          this.currentCall = data;
          socketService.off('call:initiated', handleInitiated);
          socketService.off('call:error', handleError);
          resolve(data);
        };

        const handleError = (error) => {
          this.endCall();
          socketService.off('call:initiated', handleInitiated);
          socketService.off('call:error', handleError);
          reject(new Error(error.error));
        };

        socketService.on('call:initiated', handleInitiated);
        socketService.on('call:error', handleError);
      });
    } catch (error) {
      this.endCall();
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId) {
    try {
      if (this.isCallActive) {
        throw new Error('Already in a call');
      }

      this.isCallActive = true;

      // Get user media
      await this.getUserMedia(this.currentCall?.callType === 'video');

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Accept the call
      socketService.socket.emit('call:accept', { callId });

    } catch (error) {
      this.endCall();
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  rejectCall(callId) {
    socketService.socket.emit('call:reject', { callId });
    this.currentCall = null;
  }

  /**
   * End the current call
   */
  endCall() {
    if (this.currentCall) {
      socketService.socket.emit('call:end', { callId: this.currentCall.callId });
    }

    this.cleanup();
  }

  /**
   * Get user media (microphone and/or camera)
   */
  async getUserMedia(includeVideo = false) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: includeVideo ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Emit event for UI to handle local stream
      this.emit('localStream', this.localStream);
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  /**
   * Create WebRTC peer connection
   */
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.emit('remoteStream', this.remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        socketService.socket.emit('webrtc:ice-candidate', {
          callId: this.currentCall.callId,
          candidate: event.candidate,
          targetUserId: this.getOtherUserId(),
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.emit('connectionState', state);
      
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.endCall();
      }
    };
  }

  /**
   * Handle incoming call
   */
  handleIncomingCall(data) {
    this.currentCall = data;
    this.callType = data.callType;
    this.emit('incomingCall', data);
  }

  /**
   * Handle call accepted
   */
  async handleCallAccepted(data) {
    try {
      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      socketService.socket.emit('webrtc:offer', {
        callId: data.callId,
        offer,
        targetUserId: data.acceptedBy,
      });

      this.emit('callAccepted', data);
    } catch (error) {
      console.error('Error handling call accepted:', error);
      this.endCall();
    }
  }

  /**
   * Handle call rejected
   */
  handleCallRejected(data) {
    this.emit('callRejected', data);
    this.cleanup();
  }

  /**
   * Handle call ended
   */
  handleCallEnded(data) {
    this.emit('callEnded', data);
    this.cleanup();
  }

  /**
   * Handle call missed
   */
  handleCallMissed(data) {
    this.emit('callMissed', data);
    this.cleanup();
  }

  /**
   * Handle call error
   */
  handleCallError(error) {
    this.emit('callError', error);
    this.cleanup();
  }

  /**
   * Handle WebRTC offer
   */
  async handleOffer(data) {
    try {
      await this.peerConnection.setRemoteDescription(data.offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      socketService.socket.emit('webrtc:answer', {
        callId: data.callId,
        answer,
        targetUserId: data.fromUserId,
      });
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      this.endCall();
    }
  }

  /**
   * Handle WebRTC answer
   */
  async handleAnswer(data) {
    try {
      await this.peerConnection.setRemoteDescription(data.answer);
      this.emit('callConnected');
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      this.endCall();
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(data) {
    try {
      await this.peerConnection.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  /**
   * Toggle microphone
   */
  toggleMicrophone() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.emit('microphoneToggled', audioTrack.enabled);
        return audioTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Toggle camera
   */
  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.emit('cameraToggled', videoTrack.enabled);
        return videoTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Switch camera (front/back on mobile)
   */
  async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // This is a simplified version - full implementation would cycle through available cameras
        const constraints = {
          video: {
            facingMode: videoTrack.getSettings().facingMode === 'user' ? 'environment' : 'user'
          }
        };
        
        try {
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          // Replace the video track in peer connection
          const sender = this.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
          
          // Replace in local stream
          this.localStream.removeTrack(videoTrack);
          this.localStream.addTrack(newVideoTrack);
          
          videoTrack.stop();
          
          this.emit('cameraSwitched', newVideoTrack);
        } catch (error) {
          console.error('Error switching camera:', error);
        }
      }
    }
  }

  /**
   * Get the other user's ID in the call
   */
  getOtherUserId() {
    if (!this.currentCall) return null;
    
    const currentUserId = socketService.userId;
    return this.currentCall.callerId === currentUserId 
      ? this.currentCall.receiverId 
      : this.currentCall.callerId;
  }

  /**
   * Check if currently in a call
   */
  isInCall() {
    return this.isCallActive && this.currentCall !== null;
  }

  /**
   * Get current call info
   */
  getCurrentCall() {
    return this.currentCall;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.isCallActive = false;
    this.currentCall = null;
    this.callType = null;

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset remote stream
    this.remoteStream = null;

    this.emit('callCleanup');
  }

  /**
   * Event emitter functionality
   */
  emit(event, data) {
    const callbacks = this.listeners?.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in call service event callback:', error);
      }
    });
  }

  on(event, callback) {
    if (!this.listeners) {
      this.listeners = new Map();
    }
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners?.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
}

export default new CallService();