import pylsl
import json
import asyncio
import websockets

# Connect to Petal LSL stream

def find_eeg_stream():
    streams = pylsl.resolve_streams() # List available streams
    eeg_streams = [stream for stream in streams if stream.type() == 'EEG'] # Creates a list that has 'EEG' type streams
    return eeg_streams[0] if eeg_streams else None # Returns the first EEG type stream if it is there

# Read from the LSL stream and send only one value
async def send_eeg_data():
    while True:
        try:
            async with websockets.connect('ws://localhost:8765') as websocket:
                print("Websocket connected")

                # Resolve eeg stream
                eeg_stream = find_eeg_stream()
                if not eeg_stream:
                    print("No eeg stream found!")
                    return
                inlet = pylsl.StreamInlet(eeg_stream)

                while True:
                    # Pull a sample from the LSL stream
                    sample, timestamp = inlet.pull_sample(timeout=1.0)
                    if sample is None:
                        print("No data received, retrying...")
                        continue

                    # Extract the specific channel value (AF7)
                    af7_value = sample[1]
                    data_to_send = {
                        'timestamp': timestamp,
                        'AF7': af7_value
                    }

                    # Log and then send the data
                    print(f"Sending AF7 data:{data_to_send}")
                    await websocket.send(json.dumps(data_to_send))

                    # Limit data rate
                    await asyncio.sleep(0.1)
        except (websockets.exceptions.ConnectionClosedError, ConnectionRefusedError) as e:
            print(f"WebSocket connection error: {e}. Retrying in 5 seconds...") 
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Unexpected error: {e}. Retrying...")
            await asyncio.sleep(5)

# Run the function
asyncio.run(send_eeg_data())