# Setting up the stream

- It will need Petal Metrics to stream the data from Muse 2.
- Open the sketch in the browser. If using VSCode 'Go live'.
- Start the LSL stream using the Petal Metrics app.
<img width="323" alt="petal metrics app" src="https://github.com/user-attachments/assets/fe6e1572-8584-480b-8e34-245f16acb019" />

- Then open two terminals. One for running the python script and another for a node server.
- In the first Terminal window go to the directory that has server.js file and start the server using `node server.js`
- In the second Terminal window start the python script `python main.py`
- This should start sending values to the sketch

# Solver

- To start solving the grid (once the Reading EEG values.. message is gone) press the button 'Start Solving'.
- Then to get a new set of values click on 'Refresh EEG values'. 
- Refresh the browser as well to load new values.
