package com.smartfactory.apigateway.service;

import com.corundumstudio.socketio.SocketIOServer;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisSubscriber {

    private static final Logger logger = LoggerFactory.getLogger(RedisSubscriber.class);
    private final SocketIOServer socketIOServer;

    public void onMessage(String message) {
        // Forward the message received from Redis to all connected WebSocket clients
        socketIOServer.getBroadcastOperations().sendEvent("telemetry_update", message);
    }
}
