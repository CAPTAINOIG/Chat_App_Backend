const logger = require('../utils/logger');

class CallService {
  constructor() {
    this.activeCalls = new Map(); // callId -> callData
    this.userCalls = new Map(); // userId -> callId
  }

  /**
   * Create a new call
   */
  createCall(callerId, receiverId, callType = 'voice') {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const callData = {
      callId,
      callerId,
      receiverId,
      callType, // 'voice' or 'video'
      status: 'calling', // calling, accepted, rejected, ended, missed
      startTime: new Date(),
      endTime: null,
      duration: 0,
      participants: [callerId, receiverId],
    };

    this.activeCalls.set(callId, callData);
    this.userCalls.set(callerId, callId);
    this.userCalls.set(receiverId, callId);

    logger.info(`Call created: ${callId} (${callType}) from ${callerId} to ${receiverId}`);
    return callData;
  }

  /**
   * Accept a call
   */
  acceptCall(callId, userId) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    if (call.receiverId !== userId) {
      throw new Error('Unauthorized to accept this call');
    }

    if (call.status !== 'calling') {
      throw new Error('Call cannot be accepted in current state');
    }

    call.status = 'accepted';
    call.acceptTime = new Date();
    
    this.activeCalls.set(callId, call);
    
    logger.info(`Call accepted: ${callId} by ${userId}`);
    return call;
  }

  /**
   * Reject a call
   */
  rejectCall(callId, userId) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    if (call.receiverId !== userId) {
      throw new Error('Unauthorized to reject this call');
    }

    call.status = 'rejected';
    call.endTime = new Date();
    call.duration = call.endTime - call.startTime;

    this.activeCalls.set(callId, call);
    this.cleanupCall(callId);

    logger.info(`Call rejected: ${callId} by ${userId}`);
    return call;
  }

  /**
   * End a call
   */
  endCall(callId, userId) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    if (!call.participants.includes(userId)) {
      throw new Error('Unauthorized to end this call');
    }

    call.status = 'ended';
    call.endTime = new Date();
    
    // Calculate duration from accept time or start time
    const startTime = call.acceptTime || call.startTime;
    call.duration = call.endTime - startTime;

    this.activeCalls.set(callId, call);
    this.cleanupCall(callId);

    logger.info(`Call ended: ${callId} by ${userId}, duration: ${call.duration}ms`);
    return call;
  }

  /**
   * Mark call as missed
   */
  markCallAsMissed(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    call.status = 'missed';
    call.endTime = new Date();
    call.duration = call.endTime - call.startTime;

    this.activeCalls.set(callId, call);
    this.cleanupCall(callId);

    logger.info(`Call marked as missed: ${callId}`);
    return call;
  }

  /**
   * Get call by ID
   */
  getCall(callId) {
    return this.activeCalls.get(callId);
  }

  /**
   * Get user's active call
   */
  getUserCall(userId) {
    const callId = this.userCalls.get(userId);
    return callId ? this.activeCalls.get(callId) : null;
  }

  /**
   * Check if user is in a call
   */
  isUserInCall(userId) {
    const callId = this.userCalls.get(userId);
    if (!callId) return false;
    
    const call = this.activeCalls.get(callId);
    return call && ['calling', 'accepted'].includes(call.status);
  }

  /**
   * Clean up call references
   */
  cleanupCall(callId) {
    const call = this.activeCalls.get(callId);
    if (call) {
      // Remove user call references
      call.participants.forEach(userId => {
        this.userCalls.delete(userId);
      });
    }
    
    // Keep call data for a short while for history, then remove
    setTimeout(() => {
      this.activeCalls.delete(callId);
    }, 30000); // 30 seconds
  }

  /**
   * Get call history for user
   */
  getCallHistory(userId) {
    const userCalls = [];
    
    for (const [callId, call] of this.activeCalls) {
      if (call.participants.includes(userId) && call.endTime) {
        userCalls.push({
          callId: call.callId,
          callType: call.callType,
          status: call.status,
          startTime: call.startTime,
          endTime: call.endTime,
          duration: call.duration,
          isIncoming: call.receiverId === userId,
          otherUserId: call.callerId === userId ? call.receiverId : call.callerId,
        });
      }
    }

    return userCalls.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Auto-cleanup missed calls
   */
  startCleanupTimer() {
    setInterval(() => {
      const now = new Date();
      
      for (const [callId, call] of this.activeCalls) {
        // Auto-end calls that have been ringing for too long (30 seconds)
        if (call.status === 'calling' && (now - call.startTime) > 30000) {
          this.markCallAsMissed(callId);
        }
      }
    }, 5000); // Check every 5 seconds
  }
}

module.exports = new CallService();