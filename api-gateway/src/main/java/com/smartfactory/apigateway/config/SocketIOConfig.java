package com.smartfactory.apigateway.config;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;

@Slf4j
@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    private SocketIOServer server;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setHostname("0.0.0.0");
        config.setPort(4001); 
        config.setOrigin("*");
        this.server = new SocketIOServer(config);
        return this.server;
    }

    @Bean
    public CommandLineRunner socketRunner(SocketIOServer server) {
        return args -> {
            try {
                server.start();
                log.info("Netty Socket.IO Server successfully started on 0.0.0.0:4001");
            } catch (Exception e) {
                log.error("Failed to start Netty Socket.IO server: {}", e.getMessage());
            }
        };
    }

    @PreDestroy
    public void stopServer() {
        if (server != null) {
            server.stop();
        }
    }
}
