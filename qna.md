# Project Review Q&A - Logicly Visual Debugger

This document contains 20 likely questions your examiner might ask, along with detailed, technical answers to help you ace your review.

---

## **General & Architecture**

### **1. What is the core problem your project solves?**
**Answer:** Learning programming, especially concepts like **recursion** and **algorithms**, is difficult because code execution is invisible. Students often struggle to visualize how the stack changes or how variables update step-by-step. My project, **Logicly**, solves this by providing a "glass-box" view of execution. It visualizes the control flow, variable states, and recursion tree in real-time, making abstract concepts concrete.

### **2. Explain the high-level architecture of your application.**
**Answer:** The application follows a **Client-Server architecture**:
*   **Frontend (Client):** Built with **React.js**. It handles the user interface, code editing, and visualization (using D3.js for trees). It sends the user's code to the backend via a REST API.
*   **Backend (Server):** Built with **Python Flask**. It acts as the execution engine. It receives the code, runs it safely, traces the execution steps, analyzes complexity, and returns a structured JSON response containing the entire execution history.

### **3. Why did you choose this specific Tech Stack (Flask + React)?**
**Answer:**
*   **Flask (Backend):** Since we are building a *Python* debugger, the backend *must* be in Python to natively execute and trace the code. Flask is lightweight and perfect for creating simple API endpoints without the overhead of Django.
*   **React (Frontend):** The application is highly interactive (stepping through code, updating trees, changing variable tables). React's **Virtual DOM** and **State Management** (useState/useEffect) make it efficient to update these UI components dynamically without reloading the page.

### **4. What is the data flow when a user clicks "Debug"?**
**Answer:**
1.  **Request:** The Frontend sends a POST request to `/api/debug` with the user's Python code and input data.
2.  **Execution:** The Backend receives the code. It initializes a `SimpleTracer` class and uses `sys.settrace()` to hook into the Python interpreter.
3.  **Tracing:** As the code runs, the tracer records every line number, variable state, and function call into a list (`debug_states`).
4.  **Analysis:** After execution, the backend uses the `ast` module to statically analyze the code for Time/Space complexity.
5.  **Response:** The backend sends back a JSON object containing `debugStates`, `callHierarchy`, and `complexity`.
6.  **Visualization:** The Frontend receives this data and initializes the `currentStep` to 0, displaying the first state.

---

## **Backend Logic (The Core)**

### **5. How does the backend actually "watch" the code execution?**
**Answer:** We use Python's built-in `sys.settrace(trace_function)` capability.
*   This function registers a callback that the Python interpreter calls **before executing every line**.
*   In our `python_debugger.py`, the `SimpleTracer` class defines this callback.
*   Inside the callback, we access the current **Frame Object** (`frame`), which gives us the current line number (`frame.f_lineno`) and the local variables (`frame.f_locals`). We save this snapshot to our list of states.

### **6. How do you handle infinite loops in the user's code?**
**Answer:** This is a critical safety feature. In a production environment, we would implement a **timeout** or a **step limit**.
*   **Step Limit:** Inside our tracer, we can check `if len(self.debug_states) > MAX_STEPS (e.g., 1000)`. If it exceeds this, we raise a custom exception to stop execution.
*   **Timeout:** We can run the execution in a separate thread or process with a strict time limit (e.g., 5 seconds). If it doesn't finish, we kill the process.
*   *Current Implementation Note:* We rely on the natural termination or manual server restart if it hangs, but adding a step counter check in `trace_lines` is the standard fix.

### **7. How is the Time and Space complexity calculated?**
**Answer:** We do **not** measure the actual time taken (which varies by machine). Instead, we use **Static Analysis** with Python's `ast` (Abstract Syntax Tree) module.
*   We parse the code into a tree structure.
*   We walk through the tree looking for `For` and `While` nodes.
*   If we find nested loops (a loop inside a loop), we estimate **O(n²)**.
*   If we find a function calling itself (recursion), we estimate **O(2^n)** or **O(n)** depending on the pattern.
*   This provides a theoretical "Big-O" estimation rather than a runtime benchmark.

### **8. What are the security risks of running user code, and how do you mitigate them?**
**Answer:** Running arbitrary code (`exec()`) is dangerous (Remote Code Execution vulnerability). A user could try to delete files or access environment variables.
*   **Mitigation:**
    1.  **Restricted Globals:** When calling `exec(code, globals)`, we pass a restricted dictionary, preventing access to dangerous modules like `os` or `subprocess` (though our current dev version imports them for the debugger itself, a production version would strip these).
    2.  **Containerization:** The best practice is to run the backend in an isolated **Docker container**. If the user crashes the system, they only crash the container, not the host server.

### **9. Explain the difference between `trace_calls` and `trace_lines`.**
**Answer:** These are the two main events `sys.settrace` handles:
*   **`trace_calls`**: Triggered when a **function is entered**. We use this to push a new item onto our `call_stack` and generate a unique `call_id` for the Recursion Tree.
*   **`trace_lines`**: Triggered before a **line of code is executed**. We use this to capture the current line number and the values of local variables at that exact moment.

### **10. How do you handle complex variable types like Lists or Objects?**
**Answer:** The `frame.f_locals` dictionary gives us the actual Python objects. We cannot send raw Python objects to the frontend (JSON doesn't support them).
*   We iterate through the variables and convert them to strings using `repr()` or `str()`.
*   For example, a list `[1, 2, 3]` becomes the string `"[1, 2, 3]"`.
*   This ensures the data is JSON-serializable and safe to send over the API.

---

## **Frontend & Visualization**

### **11. How is the Recursion Tree generated?**
**Answer:**
1.  The backend sends a `callHierarchy` list, which links every function call to its `parent_id`.
2.  In the Frontend (`RecursionTree.jsx`), we use **D3.js**.
3.  We convert the flat list into a hierarchical tree structure using `d3.hierarchy()`.
4.  `d3.tree()` then calculates the X and Y coordinates for every node to ensure they are spaced out correctly.
5.  We render these nodes as SVG circles and connect them with lines (links).

### **12. How does the "Step-by-Step" navigation work?**
**Answer:**
*   The backend returns an **array** of states: `[State_0, State_1, State_2, ...]`.
*   The Frontend maintains a state variable: `const [currentStep, setCurrentStep] = useState(0);`.
*   When you click "Next", we simply increment `currentStep`.
*   The UI components (Editor, Variables, Tree) simply read from `debugData[currentStep]`. This makes "time travel" debugging very easy—we just change the index.

### **13. How does the frontend know which line to highlight?**
**Answer:**
*   Every state object in the `debugStates` array has a `line` property (e.g., `line: 14`).
*   We pass this `line` number to the `CodeEditor` component.
*   The editor (likely using a library or custom CSS) applies a "highlight" class (e.g., yellow background) to that specific line number.

### **14. What is the role of `App.jsx`?**
**Answer:** `App.jsx` is the **Controller** or "Source of Truth".
*   It holds the global state (`code`, `debugData`, `currentStep`).
*   It handles the API call (`handleDebug`).
*   It passes data *down* to the child components (`VariablesPanel`, `RecursionTree`).
*   It ensures all components are synchronized. If `currentStep` changes, *all* components update to reflect that specific moment in time.

### **15. Why use D3.js instead of a simpler chart library?**
**Answer:** Standard chart libraries (like Chart.js) are good for bar/line charts but poor for **custom hierarchical structures** like trees.
*   D3.js gives us low-level control over the SVG.
*   We need to dynamically calculate node positions based on the tree depth.
*   We need custom interactions like **Zooming**, **Panning**, and **Collapsing** nodes, which D3 handles natively.

---

## **Advanced & Future Scope**

### **16. How would you add support for other languages like Java or C++?**
**Answer:**
*   We would need a different backend strategy. `sys.settrace` is Python-specific.
*   For **Java**: We could use the **JDI (Java Debug Interface)**.
*   For **C++**: We might wrap **GDB (GNU Debugger)** and parse its machine interface (GDB/MI) output.
*   The Frontend would remain largely the same; the Backend would just need a new "driver" to produce the same JSON format (`debugStates`) from the other languages.

### **17. What happens if the user's code has a syntax error?**
**Answer:**
*   The `exec()` function in Python will raise a `SyntaxError` immediately.
*   Our `try...except` block in `python_debugger.py` catches this.
*   We return a JSON response with `success: False` and the error message.
*   The Frontend checks `if (!response.success)` and displays the error message in a red alert box to the user.

### **18. How do you distinguish between a recursive call and a normal function call?**
**Answer:**
*   Technically, the tracer treats them the same (it's just a function entry).
*   However, in our `RecursionTree` logic, we can check the function name.
*   If a function `fact` calls `fact` again (and the parent's function name is the same as the child's), it is visually represented as a recursive step.
*   Our `callHierarchy` tracks the `parent_id`, so we can reconstruct the exact chain regardless of the function names.

### **19. What was the most challenging part of this project?**
**Answer:** (Choose one of these)
*   *Option A:* **Visualizing the Recursion Tree.** Mapping the linear execution trace (which is just a list of steps) back into a tree structure (parent-child relationships) was tricky. I had to track `call_id` and `parent_id` manually in the tracer.
*   *Option B:* **Handling State Consistency.** Ensuring that when I click "Back", the variables panel, the editor highlight, and the tree all revert to the exact correct state required careful state management in React.

### **20. What are the limitations of your current implementation?**
**Answer:**
1.  **Security:** Running `exec()` is inherently risky without a sandbox (Docker).
2.  **Performance:** `sys.settrace` slows down execution significantly. It is fine for educational snippets but too slow for heavy production code.
3.  **Library Support:** It currently doesn't support debugging inside external libraries (like NumPy or Pandas) because we explicitly filter those out to keep the trace clean for the student.
