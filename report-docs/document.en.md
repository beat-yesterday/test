Here is the English version of the Technical Design Document outline, translated with professional technical terminology suitable for a Senior Frontend Engineer.

---

### **Project: Dynamic Report Template Development & Cross-Stack Integration**
**Document Type:** Technical Design Document (Business Logic Focus)
**Scope:** Low-Code Platform (Vue3) & Management System (Angular)

### **1. Context & Objectives**
* **Business Requirement:** Enable the rapid configuration of new report templates via the Low-Code platform, which can be instantly published and consumed within the Angular-based system without secondary code development.
* **User Stories:**
    * **As an Operator:** I want to drag and drop components in the editor to create a "Monthly Sales Report."
    * **As a System User:** I want to view this report directly in the "Report Center" of the Angular dashboard with real-time data.
* **Core Value:** Reduce report development lead time and enable "Hot Updates" for report configurations.

### **2. Architecture & Workflow**
* **System Interaction:** Define the relationship between the Vue3 Editor, Backend Storage, and the Angular Renderer.
* **Data Flow Logic:**
    1.  **Definition Phase (Vue3):** Component Drag & Drop -> Generate Schema JSON -> Validation -> Publish -> Store in DB.
    2.  **Runtime Phase (Angular):** Get Report ID -> Fetch Schema -> Parse Schema -> Fetch Business Data -> Render View.

### **3. Core Data Structure (Schema Design)**
> *The Schema is the contract. It must be strictly defined before coding.*
* **Report Template Schema (JSON):**
    * **Metadata:** `reportId`, `name`, `version`, `author`.
    * **Layout Config:** Grid/Flex layout parameters, responsive strategies (width/height adaptation).
    * **Component Tree:** Definitions of charts (Bar/Table/KPI Cards), positioning, and styling props.
    * **DataSource Config:** API endpoints for internal components, parameter mapping (Params Mapping).
* **Code Example:** (Brief JSON snippet illustrating the structure).

### **4. Detailed Design: Producer Side (Vue3 Low-Code Platform)**
* **Atomic Component Development:**
    * Identify new base widgets required (e.g., `AdvancedTableWidget`, `ChartWidget`).
    * Define Props and develop the configuration panels (Setters).
* **Data Binding Logic:**
    * Mechanism for dynamic parameter configuration (e.g., Global Time Range Filters).
    * Implementation of "Mock Data" preview within the editor.
* **Publishing Mechanism:**
    * Versioning strategy (Overwrite vs. Incremental).
    * Pre-flight Schema Validation (Ensure compatibility with the Angular renderer).

### **5. Detailed Design: Consumer Side (Angular Report Module)**
* **Integration Strategy:**
    * *Option A (Recommended):* **Web Components / Micro-frontend**. Package the Vue3 renderer as a Web Component (Custom Element) for Angular to consume.
    * *Option B (Lightweight):* **Iframe Embedding**. Angular loads the Vue render page via Iframe using `postMessage` for communication.
    * *Option C (Native):* **Angular Parser**. Write a native Angular engine to parse the JSON Schema (High cost, style consistency risks).
    * *(Explicitly state the chosen approach, e.g., Option A).*
* **Renderer Implementation:**
    * Logic for fetching and loading the remote Schema.
    * Injecting Angular context (e.g., Current Global Date Filter) into the Vue component.
* **Communication & Events:**
    * **Angular -> Report:** Passing `authToken`, `filterParams`.
    * **Report -> Angular:** Emitting `clickEvents` (e.g., Drill-down actions), `error` events.

### **6. API Specification**
* **Management APIs (Producer):**
    * `POST /api/report/publish` (Save Template Schema)
    * `GET /api/report/list` (List available reports)
* **Runtime APIs (Consumer):**
    * `GET /api/report/detail/{id}` (Fetch specific version Schema)
    * `POST /api/data/proxy` (Data proxy interface if cross-origin or unified gateway is needed)

### **7. Error Handling & Stability**
* **Schema Parsing Failures:** Graceful degradation and user alerts in the Angular app.
* **Data Timeout/Network Errors:** Loading states and retry mechanisms for internal report widgets.
* **Style Isolation (CSS Scoping):** Strategy to prevent Vue3 styles from polluting the Angular global scope (e.g., Shadow DOM or CSS Modules).

### **8. Acceptance Criteria**
* **Functional:** A template published from the Vue3 side must load within the Angular application in under 2 seconds with pixel-perfect styling.
* **Compatibility:** Ensure proper lifecycle management (destroy/unmount) when switching routes in Angular to prevent memory leaks.

---

### **Next Step**
Would you like me to detail the **"Integration Strategy" (Web Components approach)** specifically, providing a code example of how to wrap the Vue3 renderer as a Custom Element for Angular?
