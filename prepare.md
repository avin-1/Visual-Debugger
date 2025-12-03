# Logicly Visual Debugger - Project Report

## 1. Project Overview
**Project Name:** Logicly Visual Debugger
**Description:** A web-based educational tool designed to visualize the execution of Python code. It provides a step-by-step breakdown of code execution, visualizes recursion trees, tracks variable states, and estimates time/space complexity. It is particularly useful for understanding complex algorithms and recursive functions.

## 2. Tech Stack & Architecture

### Backend
*   **Language:** Python
*   **Framework:** Flask (Micro-framework)
*   **Key Libraries:**
    *   `sys.settrace`: For intercepting and recording code execution steps.
    *   `ast` (Abstract Syntax Tree): For static analysis to estimate complexity.
    *   `flask-cors`: To handle Cross-Origin Resource Sharing (allowing frontend to talk to backend).

### Frontend
*   **Library:** React (built with Vite)
*   **Styling:** Tailwind CSS (Utility-first CSS framework)
*   **Animations:** Framer Motion
*   **Visualization:** D3.js (Data-Driven Documents) for the Recursion Tree.
*   **State Management:** React `useState`, `useEffect`.

### Architecture Flow
1.  **User Input:** User writes Python code in the React Frontend.
2.  **API Call:** Frontend sends code to Backend via `/api/debug`.
3.  **Execution & Tracing:** Backend runs the code in a sandbox using `sys.settrace`, recording every line execution, variable change, and function call.
4.  **Complexity Analysis:** Backend parses the code using `ast` to estimate Big-O complexity.
5.  **Response:** Backend returns a JSON object containing the list of "Debug States" and "Call Hierarchy".
6.  **Visualization:** Frontend renders the data:
    *   **Code Editor:** Highlights the current line.
    *   **Variables Panel:** Shows current variable values.
    *   **Recursion Tree:** Draws the function call structure using D3.js.

---

## 3. Detailed File Explanation

### Backend (`/backend`)

#### `app.py`
*   **Purpose:** The main entry point for the Flask application. It defines the API endpoints.
*   **Key Routes:**
    *   `/` & `/api/health`: Health check endpoints to verify the server is running.
    *   `/api/debug` (POST): The core endpoint. Receives `{ code, input }`, calls `debug_python`, and returns the execution trace.
    *   `/api/languages`: Returns supported languages (currently Python).
*   **Key Logic:** Handles CORS, logging, and error handling for the API.

#### `python_debugger.py`
*   **Purpose:** Contains the core logic for debugging and analysis.
*   **Key Classes/Functions:**
    *   `SimpleTracer`: A class that implements the tracing logic.
        *   `trace_calls`: Called when a function is entered. Records function name, arguments, and updates the call stack.
        *   `trace_lines`: Called before a line is executed. Records line number and local variables.
    *   `debug_python(code, input_data)`: Sets up the `SimpleTracer`, executes the user's code using `exec()`, and captures standard output/error.
    *   `analyze_complexity(code)`: Uses Python's `ast` module to walk through the code structure (without running it) to count loops and recursion for Big-O estimation.
    *   `simplify_debug_states`: Cleans up the raw trace data to make it lighter for the frontend.

### Frontend (`/frontend/src`)

#### `App.jsx`
*   **Purpose:** The main React component that orchestrates the entire application.
*   **Key State:**
    *   `code`: The Python code in the editor.
    *   `debugData`: The JSON response from the backend (trace data).
    *   `currentStep`: An integer tracking which step of execution is currently being shown.
*   **Layout:** Uses a grid layout to display the Editor, Variables, Timeline, and Recursion Tree.

#### `components/RecursionTree.jsx`
*   **Purpose:** Visualizes recursive function calls as a tree.
*   **Tech:** Uses **D3.js**.
*   **Logic:**
    *   Converts the flat `callHierarchy` list into a hierarchical tree structure.
    *   Uses `d3.tree()` to calculate node positions.
    *   Draws SVG lines (links) and circles (nodes).
    *   Implements Zoom and Drag behavior.

#### `components/CodeEditor.jsx`
*   **Purpose:** A code editor component (likely using `react-simple-code-editor` or similar) that allows users to write code and highlights the line corresponding to `currentStep`.

#### `components/VariablesPanel.jsx`
*   **Purpose:** Displays the local variables for the current step. It receives `currentState` as a prop and renders a table/list of variable names and values.

#### `components/DebugTimeline.jsx`
*   **Purpose:** A slider or set of controls (Next/Prev) to navigate through the `debugStates`. It updates the `currentStep` state in `App.jsx`.

#### `components/RecursionAnalytics.jsx`
*   **Purpose:** Displays the estimated Time and Space complexity calculated by the backend.

---

## 4. Code Deep Dive & Concepts

### Concept 1: `sys.settrace` (Backend)
This is the magic behind the debugger. It allows you to register a callback function that Python calls *every time* something interesting happens (function call, line execution, return, exception).

**Snippet from `python_debugger.py`:**
```python
def trace_lines(self, frame, event, arg):
    if event == 'line':
        # 1. Get current line number
        line_no = frame.f_lineno
        # 2. Capture local variables
        variables = frame.f_locals.copy()
        # 3. Save state
        self.debug_states.append({
            'line': line_no,
            'variables': variables
        })
```

### Concept 2: Abstract Syntax Tree (AST) (Backend)
Used for complexity analysis. Instead of running the code (which takes time), we look at its structure.

**Snippet from `python_debugger.py`:**
```python
import ast
# ... inside analyze_complexity ...
tree = ast.parse(code)
for node in ast.walk(tree):
    if isinstance(node, ast.For) or isinstance(node, ast.While):
        complexity['has_loops'] = True
        # Logic to count nesting depth...
```

### Concept 3: React State & Props (Frontend)
The frontend relies heavily on "Lifting State Up". `App.jsx` holds the "truth" (`currentStep`), and passes it down to children.

**Snippet from `App.jsx`:**
```javascript
const [currentStep, setCurrentStep] = useState(0);

// Passing data down to children
<CodeEditor currentLine={debugData[currentStep].line} />
<VariablesPanel variables={debugData[currentStep].variables} />
<DebugTimeline onStepChange={setCurrentStep} />
```

---

## 5. Project Review Q&A

### General & Tech Stack
**Q: Why did you choose Flask for the backend?**
**A:** Flask is lightweight and written in Python. Since we are building a *Python* debugger, it makes the most sense to use a Python backend so we can natively execute and trace the user's code using Python's internal libraries like `sys` and `ast`.

**Q: Why React for the frontend?**
**A:** React's component-based architecture is perfect for this. We have distinct UI elements (Editor, Tree, Variables) that need to update dynamically as the user steps through the code. React's Virtual DOM ensures these updates are fast and smooth.

**Q: How do you handle infinite loops in user code?**
**A:** (Potential Answer based on typical implementation) The `sys.settrace` function usually has a limit on the number of steps it records (e.g., 1000 steps). If the code exceeds this, we stop execution to prevent the server from crashing.

### Technical Implementation
**Q: How does the Recursion Tree work?**
**A:** We use the D3.js library. The backend sends a `callHierarchy` which tells us which function called which. We convert this into a tree data structure in JavaScript and use `d3.tree()` to calculate x/y coordinates for every node, then render them as SVG elements.

**Q: How is complexity calculated? Is it always accurate?**
**A:** It is an *estimation* based on Static Analysis using `ast`. We count the depth of nested loops and check for recursive calls. It is not perfect (it can't predict runtime behavior dependent on input values), but it gives a good theoretical Big-O upper bound.

**Q: What is `sys.settrace`?**
**A:** It is a Python system function that allows you to set a global trace function. This function is called by the Python interpreter at every line of execution, allowing us to inspect the current frame, variables, and line number.

---

## 6. Coding Challenges (Prepare for "Mam")

Here are code snippets related to the project concepts that you might be asked to write.

### 1. Flask: Create a simple API endpoint
**Task:** Write a Flask route that accepts a name via POST and returns a greeting.
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/greet', methods=['POST'])
def greet():
    data = request.get_json()
    name = data.get('name', 'Guest')
    return jsonify({
        "message": f"Hello, {name}!",
        "status": "success"
    })

if __name__ == '__main__':
    app.run(debug=True)
```

### 2. Python: Recursive Factorial (The default example)
**Task:** Write a recursive function to find the factorial of a number.
```python
def factorial(n):
    # Base Case: Stop recursion when n is 1 or 0
    if n <= 1:
        return 1
    # Recursive Case: n * factorial of (n-1)
    else:
        return n * factorial(n - 1)

print(factorial(5)) # Output: 120
```

### 3. React: A Simple Counter (State Management)
**Task:** Create a button that increments a counter.
```javascript
import React, { useState } from 'react';

function Counter() {
    // Define state 'count' with initial value 0
    const [count, setCount] = useState(0);

    return (
        <div className="p-4">
            <h1>Count: {count}</h1>
            <button 
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={() => setCount(count + 1)}
            >
                Increment
            </button>
        </div>
    );
}
export default Counter;
```

### 4. React: Fetching Data from API
**Task:** How do you call the backend from React?
```javascript
// Using async/await with fetch
const debugCode = async (code) => {
    try {
        const response = await fetch('http://localhost:5000/api/debug', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code }),
        });
        
        const data = await response.json();
        console.log("Debug Data:", data);
    } catch (error) {
        console.error("Error debugging:", error);
    }
};
```
