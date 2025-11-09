export const callDebugAPI = async (code, testCase) => {
  try {
    const response = await fetch("http://localhost:5000/api/debug", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // backend expects `input` for stdin content
      body: JSON.stringify({ code, input: testCase }),
    });

    if (!response.ok) {
      // try to get useful error text from server
      let errText;
      try {
        errText = await response.text();
      } catch (_) {
        errText = `HTTP ${response.status}`;
      }
      throw new Error("Failed to fetch debug data: " + errText);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling debug API:", error);
    return null;
  }
};