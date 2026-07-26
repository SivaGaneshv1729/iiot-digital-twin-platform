# 🏭 Advanced Problem Statement: Tailored for Sansyu Precision Plastics

**Target Application:** Sansyu Precision Co., Ltd. (Precision Micro-Molding & Plastics)
**Project Core:** High-Frequency IIoT Data Pipeline, Real-Time Digital Twin, & Multivariable PyTorch Anomaly Detection.

---

## 1. Context: The Complexity of Precision Plastics Manufacturing (背景)
In ultra-high precision plastic injection molding (micro-molding), tolerances are measured in microns. The production environment is highly sensitive to thermodynamic fluctuations. A modern injection molding machine (IMM) continuously generates high-velocity, high-volume telemetry data across dozens of vectors simultaneously—including barrel temperature zones, injection pressure, clamping force, cooling rates, and hydraulic micro-vibrations. 

## 2. The Core Technical Problem (課題)
The fundamental problem is not a lack of data, but the **inability of legacy IT architectures to process, contextualize, and act upon high-frequency, noisy data streams in real-time.** 

Specifically, precision plastics manufacturing faces three distinct data-handling complexities:

### A. The Latency and Data Velocity Bottleneck
Traditional factory monitoring systems rely on RESTful HTTP polling and direct writes to relational databases (e.g., PostgreSQL/SQL Server). When an IMM generates 500 telemetry events per second, direct database writes cause massive I/O locking and disk bottlenecking. Furthermore, polling data every 10 seconds is too slow; if injection pressure drops for just 2 seconds during a micro-molding cycle, a critical defect is formed, but the legacy system completely misses the anomaly.

### B. Multivariable Non-Linear Anomalies (The Failure of Threshold Alerts)
Standard SCADA systems use static Boolean thresholds (e.g., `IF Temperature > 220°C THEN Alert`). However, in precision plastics, defects are rarely caused by a single variable crossing a threshold. They are caused by complex, non-linear multivariable drifts—for example, a 0.5% drop in hydraulic pressure *combined* with a 1.2% variance in cooling time. Static rules cannot detect these nuanced, cascading failures.

### C. Cognitive Overload & Spatial Disconnection
Even if the data is captured, it is presented to plant managers as raw numerical matrices on 2D dashboards. When a thermal anomaly propagates across a cluster of cooling towers and injection machines, it is cognitively impossible for a human operator to look at a spreadsheet and instantly visualize the spatial blast-radius of the failure on the factory floor.

---

## 3. The Proposed Technical Architecture (解決策)
**SmartFactory-Nexus** was engineered to solve these exact data-handling complexities through a decoupled microservices architecture.

### A. Sub-Millisecond Telemetry Pipeline (Redis & WebSockets)
To handle the extreme velocity of IMM data without crashing the relational database, the architecture introduces a **Redis Pub/Sub Message Broker**. 
*   High-frequency sensor payloads bypass disk I/O entirely and are injected directly into Redis RAM.
*   A Node.js API Gateway subscribes to these Redis channels and broadcasts the binary states instantly to the client via **Socket.io (WebSockets)**.
*   *Result:* The latency from physical sensor reading to browser UI update is reduced to sub-millisecond levels, entirely bypassing HTTP REST polling limitations.

### B. PyTorch Deep Learning for Multivariable Correlation (FNN & LSTM)
To solve the failure of static thresholds, the system offloads anomaly detection to a Python/FastAPI microservice running **PyTorch**.
*   **Feed-Forward Neural Networks (FNN):** The model ingests normalized, multi-dimensional feature arrays (temperature, pressure, running hours) and utilizes non-linear activation functions (ReLU) to identify complex failure patterns that human operators cannot see.
*   **Long Short-Term Memory (LSTM):** Because thermal drift in plastic molding is a sequential time-series problem, the LSTM network retains hidden state memories of the machine's thermal trajectory over the last 15 minutes, allowing it to accurately forecast a catastrophic thermal spike *before* it ruins a batch of plastics.

### C. The 3D WebGL Digital Twin (Contextual Data Rendering)
To solve cognitive overload, the React frontend utilizes **Three.js / WebGL** to render a live 1:1 scale Digital Twin of the factory floor.
*   Rather than reading a chart to see that "Machine IMM-04 is overheating," the physical 3D model of IMM-04 turns red, and dynamic glowing heatmaps propagate across the affected cooling lines in real-time.
*   This instantly translates complex, multidimensional data matrices into intuitive human spatial awareness.

## 4. Strategic Alignment with Sansyu Precision (目的)
By implementing this architecture, a company like Sansyu Precision can guarantee the micron-level quality of their plastic components. The integration of high-velocity data pipelines and PyTorch predictive models ensures that microscopic thermal or pressure anomalies are detected, visualized in 3D, and corrected automatically before a single defective plastic component is ejected from the mold.
