const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8765 });
let eegValues = []; // Shared array to store EEG values
const MAX_VALUES = 81; // Limit to 81 values

console.log("WebSocket server running on ws://localhost:8765");

wss.on('connection', (ws) => {
    console.log("Client connected!");

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            // Handle refresh command
            if (parsedMessage.command === "refresh") {

                eegValues = []; // Clear stored EEG values
                console.log("Waiting for new data...");
        
                ws.send(JSON.stringify({ type: "status", message: "Refresh started" }));
            }

            // Handle incoming EEG data
            if (parsedMessage.AF7 !== undefined && parsedMessage.AF7 !== null ) {
                if (eegValues.length < MAX_VALUES) {
                    eegValues.push(parsedMessage.AF7);
                    console.log(`Stored EEG value (${eegValues.length}/81):`, parsedMessage.AF7);

                    // If there are enough values, send them to the client
                    if (eegValues.length === MAX_VALUES) {
                        console.log("Collected all 81 values.");
                        ws.send(JSON.stringify({ type: "eegValues", data: eegValues }));
                    }
                } else {
                    //console.log("EEG value ignored; maximum reached.");
                }
            }

            // Handle requests for EEG values
            if (parsedMessage.command === "getEEGValues") {
                ws.send(JSON.stringify({ type: "eegValues", data: eegValues }));
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });
});

