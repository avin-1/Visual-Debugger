import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import ComplexityPanel from "./ComplexityPanel";

const RecursionAnalytics = ({ debugData, currentStep }) => {
  // `debugData` here is expected to be the backend result object:
  // { debugStates: [...], callHierarchy: [...], complexity: {...} }
  if (!debugData || !debugData.debugStates || debugData.debugStates.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Recursion Analytics</h2>
        <p className="text-gray-500">No debug data available</p>
      </div>
    );
  }

  const functionCalls = {};
  const stackDepthOverTime = [];
  const returnValues = [];
  const loopDetails = [];
  let maxStackDepth = 0;

  debugData.debugStates.forEach((state, index) => {
    // Track function calls
    if (state.function) {
      functionCalls[state.function] = (functionCalls[state.function] || 0) + 1;
    }

    // Stack depth tracking
    const depth = state.stackDepth || 0;
    maxStackDepth = Math.max(maxStackDepth, depth);
    stackDepthOverTime.push({ step: index + 1, depth });

    // Return value tracking
    if (state.returnValue !== undefined) {
      returnValues.push({ function: state.function, value: state.returnValue });
    }

    // Loop detection heuristic: check source line string (best-effort)
    const lineStr = String(state.line || "");
    if (state.eventType === "step" && (lineStr.includes("for") || lineStr.includes("while"))) {
      loopDetails.push({
        line: lineStr,
        nesting_level: depth,
      });
    }
  });

  // Prefer backend-provided complexity if available (backend analyzer is authoritative)
  const backendComplexity = debugData.complexity;
  let complexity = null;

  if (backendComplexity && backendComplexity.time) {
    complexity = {
      time: backendComplexity.time,
      space: backendComplexity.space || "O(1)",
      has_recursion: !!backendComplexity.has_recursion,
      has_loops: !!backendComplexity.has_loops,
      loop_details: backendComplexity.loop_details || [],
    };
  } else {
    // Fallback heuristic based on callHierarchy when backend complexity is missing
    const ch = debugData.callHierarchy || [];

    // Build parent -> children map
    const parentMap = {};
    ch.forEach((c) => {
      if (c.parent_id) {
        parentMap[c.parent_id] = parentMap[c.parent_id] || [];
        parentMap[c.parent_id].push(c);
      }
    });

    // Detect branching recursion:
    // If a parent call has 2+ children that call the same function as the parent,
    // that's a strong signal of exponential branching recursion (e.g., fib).
    let branchingRecursion = false;
    for (const parentId in parentMap) {
      const children = parentMap[parentId];
      const parentNode = ch.find((x) => x.call_id === parentId);
      if (!parentNode) continue;
      const sameFuncChildren = children.filter((c) => c.function === parentNode.function);
      if (sameFuncChildren.length >= 2) {
        branchingRecursion = true;
        break;
      }
    }

    // Detect simple recursion: any child whose function equals its parent's function
    const hasRecursion = ch.some(
      (call) => ch.some((other) => other.parent_id === call.call_id && other.function === call.function)
    );

    complexity = {
      time: branchingRecursion ? "O(2^n)" : hasRecursion ? "O(n)" : loopDetails.length ? "O(n)" : "O(1)",
      space: hasRecursion ? "O(n)" : "O(1)",
      has_recursion: hasRecursion,
      has_loops: loopDetails.length > 0,
      loop_details: loopDetails.map((ld) => ({ line: ld.line, nesting_level: ld.nesting_level })),
    };
  }

  const functionCallData = Object.entries(functionCalls).map(([name, count]) => ({ name, calls: count }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Recursion Analytics</h2>

        {/* Execution Stats */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-md font-semibold mb-2">Execution Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Steps</div>
              <div className="font-semibold">{debugData.debugStates.length}</div>
            </div>
            <div>
              <div className="text-gray-500">Max Stack Depth</div>
              <div className="font-semibold">{maxStackDepth}</div>
            </div>
            <div>
              <div className="text-gray-500">Function Calls</div>
              <div className="font-semibold">{Object.values(functionCalls).reduce((a, b) => a + b, 0)}</div>
            </div>
            <div>
              <div className="text-gray-500">Return Values</div>
              <div className="font-semibold">{returnValues.length}</div>
            </div>
          </div>
        </div>

        {/* Function Call Chart */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">Function Call Distribution</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <BarChart width={500} height={200} data={functionCallData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calls" fill="#8884d8" />
            </BarChart>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">Stack Depth Over Time</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <LineChart width={500} height={200} data={stackDepthOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="depth" stroke="#82ca9d" activeDot={{ r: 8 }} />
            </LineChart>
          </div>
        </div>
      </div>

      <ComplexityPanel complexity={complexity} />
    </div>
  );
};

export default RecursionAnalytics;