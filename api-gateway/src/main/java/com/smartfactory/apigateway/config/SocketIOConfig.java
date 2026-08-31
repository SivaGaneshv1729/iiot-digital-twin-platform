package com.smartfactory.apigateway.config;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    @Value("${server.port:4000}")
    private int port;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        // Run socket.io on a different port than the main Spring Tomcat server 
        // to avoid conflicts, or we can configure it to run on the same port but Netty usually wants its own
        // Let's use 4001 for WebSockets
        config.setHostname("localhost");
        config.setPort(4001); 
        config.setOrigin("*");
        return new SocketIOServer(config);
    }
}
