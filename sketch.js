let socket;
let eegValues = []; //shared array

let readingEEG = true; // flag for "Reading EEG values" message
let gridIncomplete = false; // flag for if grid can not be filled.
let gridComplete = false; // flag for successful completion of the grid
let refreshStarted = false; // flag for refresh

let grid = [];
let possibleValues = [];
let gridDim = 9;
let cellSize;

let refreshButton;

let tiles = [];

function preload(){
    tiles[0] = loadImage("images/tile1.PNG");
    tiles[1] = loadImage("images/tile2.PNG");
    tiles[2] = loadImage("images/tile3.PNG");
    tiles[3] = loadImage("images/tile4.PNG");
    tiles[4] = loadImage("images/tile5.PNG");
    tiles[5] = loadImage("images/tile6.PNG");
    tiles[6] = loadImage("images/tile7.PNG");
    tiles[7] = loadImage("images/tile8.PNG");
    tiles[8] = loadImage("images/tile9.PNG");
   
}

function setup() {
    createCanvas(720, 720);
    cellSize = floor(width / gridDim);

    // WebSocket setup
    socket = new WebSocket('ws://localhost:8765');

    socket.onopen = () => {
        console.log("Connected to WebSocket server");
        // Request stored EEG values
        socket.send(JSON.stringify({ command: "getEEGValues" }));
    };

    socket.onmessage = (event) => {
        try {
            let message = JSON.parse(event.data);

            if (message.type === "eegValues") {
                eegValues = message.data; // Store EEG values
                console.log(`Received ${eegValues.length} EEG values from server.`);
                
                if (eegValues.length === 81) {
                    readingEEG = false; // Stop showing "Reading EEG values"
                    console.log("Received all 81 EEG values:", eegValues);
                }
            }
            if(message.type === "status"){
              console.log(message.message);
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    };

     // Button to start solving the grid
     solveGrid = createButton('Start solving');
     solveGrid.position(10, height + 10);
     solveGrid.mousePressed(enterMappedValues);

     //Button to get new EEG values or refresh EEG values
     refreshButton = createButton("Refresh EEG values")
     refreshButton.position(110, height +10)
     refreshButton.mousePressed(() => {
      if (socket.readyState === WebSocket.OPEN) {
          console.log("Requesting refreshed EEG values...");
          refreshStarted = true;

          // Send "refresh" command to the WebSocket server
          socket.send(JSON.stringify({ command: "refresh" }));
  
          // Display a loading or status message
          readingEEG = true; // Set flag to show "Reading EEG values..." message

          eegValues = []; // Clear the EEG values array locally
  
          console.log("Sent refresh request to server. Waiting for new EEG values...");

      } else {
          console.log("WebSocket is not connected. Unable to refresh EEG values.");
      }

      
  });

    initializeGrid();
}

function draw() {
    background(50,50,200);
    drawGrid();
    drawPossibilities();
    drawNum();
    drawTiles();

    // Show "Reading EEG values" message if the flag is true
    if (readingEEG) {
        fill(225);
        rect(width/2 -200, height/2-50, 400, 100);
        fill(0);
        textSize(24);
        textAlign(CENTER, CENTER);
        text("Reading EEG values...", width / 2, height / 2);

        // Display progress bar
        let progress = map(eegValues.length, 0,81,0, 300);
        fill(0,255,0);
        rect(width/2-200, height/2 +60, progress, 20);

    }
    if (gridIncomplete) {
      fill(200,0,0);
      rect(width/2 -250, height/2-50, 500, 100);
      fill(225);
      textSize(24);
      textAlign(CENTER, CENTER);
      text("Pattern couldn't be completed", width / 2, height / 2);

  }

  if (gridComplete) {
    fill(225);
    rect(width/2 -250, height/2-50, 500, 100);
    fill(0);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("Pattern completed!!", width / 2, height / 2);

}
if (refreshStarted) {
  fill(200,0,0);
  rect(width/2 -350, height/2-50, 700, 100);
  fill(225);
  textSize(15);
  textAlign(CENTER, CENTER);
  text("Getting new values.. Refresh the browser to check progress.", width / 2, height / 2);

}
  
}

function findMinMaxEEGValues() {
    if (eegValues.length > 0) {
        let minEEGValue = eegValues[0]; // Start with the first value
        let maxEEGValue = eegValues[0]; // Start with the first value

        // Loop through the array to find the min and max
        for (let i = 1; i < eegValues.length; i++) {
            if (eegValues[i] < minEEGValue) {
                minEEGValue = eegValues[i]; // Update min if a smaller value is found
            }
            if (eegValues[i] > maxEEGValue) {
                maxEEGValue = eegValues[i]; // Update max if a larger value is found
            }
        }

        return { minEEGValue, maxEEGValue };
    } else {
        console.log("EEG values array is empty.");
        return { minEEGValue: 0, maxEEGValue: 0 }; // Default values if array is empty
    }
}

function mapEEGValue(eegValue, possibleValuesForCell, minEEGValue, maxEEGValue) {
      // If there's only one possible value, enter it directly
      if (possibleValuesForCell.length === 1) {
        console.log(`Only one possible value available: ${possibleValuesForCell[0]}`);
        return possibleValuesForCell[0];
    }
 
  
  // Map the EEG value to an index in the possibleValuesForCell array
    
    let mappedValue = map(eegValue, minEEGValue, maxEEGValue, 1, possibleValuesForCell.length);
    console.log(`mapped value: ${mappedValue}, eegValue: ${eegValue}, length of possible values: ${possibleValuesForCell.length}`);

    // Convert the mapped value to an integer by flooring it
    let chosenIndex = floor(mappedValue); 

    // Ensure the index is within bounds 
    chosenIndex = constrain(chosenIndex, 0, possibleValuesForCell.length - 1);

    // Return the value at the chosen index from the possibleValues array
    return possibleValuesForCell[chosenIndex];
    console.log(`Value returned: ${possibleValuesForCell[chosenIndex]}`);
}

function enterMappedValues() {
  if (eegValues.length > 0) { // Proceed only if there are EEG values left
      let { minEEGValue, maxEEGValue } = findMinMaxEEGValues(); // Get the min and max EEG values

      let emptyCells = [];
      let minPossibleValues = Infinity;

      // Loop through the grid to find the empty cells and track the minimum possible values
      for (let row = 0; row < gridDim; row++) {
          for (let col = 0; col < gridDim; col++) {
              if (grid[row][col] === 0) { // Empty cell
                  let possibleValuesForCell = possibleValues[row][col];
                  let numPossibleValues = possibleValuesForCell.length;

                  if (numPossibleValues < minPossibleValues) {
                      // Found a new minimum, reset the emptyCells list
                      minPossibleValues = numPossibleValues;
                      emptyCells = [[row, col]]; // Start a new list with this cell
                  } else if (numPossibleValues === minPossibleValues) {
                      // Add this cell to the list of empty cells with the same number of possibilities
                      emptyCells.push([row, col]);
                  }
              }
          }
      }

      // If there are empty cells with the least number of possibilities choose the first one
      if (emptyCells.length > 0) {
          let nextCell = emptyCells[0]; 

          let row = nextCell[0];
          let col = nextCell[1];
          let possibleValuesForCell = possibleValues[row][col];
          console.log(`Row: ${row}, Column: ${col}`);
          console.log(`the possible value for this cell: ${possibleValuesForCell}`);

          // If no possible values, stop the process and print the error message
          if (possibleValuesForCell.length === 0) {
              console.log(`The constraints in the grid cannot be met. last cell filled is col: ${col} and row: ${row}`);
              gridIncomplete = true; // Displays the message "Pattern couldn't be completed"
              return; // Stop the process
          }

          // Call mapEEGValue() to get the chosen value
          let chosenValue = mapEEGValue(eegValues[0], possibleValuesForCell, minEEGValue, maxEEGValue);
          console.log(`This is the chosen value: ${chosenValue}, possibleValuesForCell:${possibleValuesForCell}`);
          // Enter the value into the grid
          enterValue(row, col, chosenValue);

          // Remove the used EEG value
          eegValues.shift(); // Remove the first EEG value from the array

          // Recalculate possible values for all cells
          calculatePossibilities();

          // Repeat the process
          setTimeout(enterMappedValues, 100); // Continue the propagation process
      } else {
          console.log("The constraints in the grid cannot be met");
          gridIncomplete = true;
      }
  } else {
      console.log("No more EEG values left to process.");
      gridComplete = true;
  }
}


function initializeGrid() {
  // Sets up the initial state of the grid
    for (let i = 0; i < gridDim; i++) {
        grid[i] = Array(gridDim).fill(0);
        possibleValues[i] = Array(gridDim).fill([]);
    }
    calculatePossibilities();
}

// numbers used in a column
function getUsedInCol(col) {
  let used = new Set();
  for (let row = 0; row < gridDim; row++) {
    //Check if the number is not in the row
    if (grid[row][col] !== 0) {
      used.add(grid[row][col]); // adds it to the used array
    }
  }
  return used;
}

// numbers used in a row
function getUsedInRow(row) {
  let used = new Set();
  for (let col = 0; col < gridDim; col++) {
    //Check if the number is not in the row
    if (grid[row][col] !== 0) {
      used.add(grid[row][col]); //adds it to the used array
    }
  }
  return used;
}

// numbers used in a subgrid
function getUsedInSubgrid(row, col) {
  let used = new Set();
  //Getting starting position wrt to row and col entered
  let startRow = floor(row / 3) * 3;
  let startCol = floor(col / 3) * 3;

  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (grid[r][c] !== 0) {
        used.add(grid[r][c]);
      }
    }
  }
  return used;
}

function calculatePossibilities(){
  //Check which values have been used
  for (let row = 0; row < gridDim; row++){
    for (let col = 0; col < gridDim; col++){
      if (grid[row][col] == 0){
        let usedInRow = getUsedInRow(row);
        let usedInCol = getUsedInCol(col);
        let usedInSubgrid = getUsedInSubgrid(row,col);

        //Possible values are those not used in row, col or subgrid
        possibleValues[row][col] = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
          num => !usedInRow.has(num) && !usedInCol.has(num) && !usedInSubgrid.has(num));
        
      }else{
        // If the cell is already filled, there are no possibilities
        possibleValues[row][col] = [grid[row][col]];
      }
    }
  }
}

function enterValue(row, col, value) {
  // get invalid values 
  let usedInCol = getUsedInCol(col);
  let usedInRow = getUsedInRow(row);
  let usedInSubgrid = getUsedInSubgrid(row,col);

  //Check if the value is valid

  if (
    !usedInRow.has(value)&&
    !usedInCol.has(value)&&
    !usedInSubgrid.has(value)
  ) {
    grid[row][col] = value; // Update grid
    calculatePossibilities(); // Recalculate possibilities
  } else {
    console.log("Invalid move!");    
  }
}

function drawGrid(){

  stroke(255);
  strokeWeight(2);

  for (let row = 0; row < gridDim; row++){
    for (let col = 0; col < gridDim; col ++){
      
      // Position of each cell
      let x = col * cellSize;
      let y = row * cellSize;

      //Draw a square for each cell
      noFill();
      rect(x, y, cellSize, cellSize);
    }
  }

  // drawing the 3x3 grid lines for the bigger squares
  strokeWeight(6);
  for (let i = 0; i < gridDim; i+=3){
    line(i*cellSize, 0, i*cellSize, height); // vertical lines 
    line(0, i*cellSize, width, i*cellSize); //horizontal lines

  }
}

function drawNum(){
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.5);
  textStyle(LIGHTEST);
  textFont('Courier');
  noStroke();
  fill(255);
  //Go through each cell
  for (let row =0; row<gridDim; row++){
    for(let col =0; col<gridDim; col++){
      //Only draw the number if it is not 0
      if(grid[row][col] !== 0){
        text(grid[row][col], col* cellSize + cellSize / 2, row * cellSize + cellSize / 2)
      }
    }
  }
  
}

function drawPossibilities() {
  textAlign(CENTER, CENTER);
  textSize(12);
  textStyle(LIGHTEST);
  textFont('Courier');
  noStroke();
  fill(200);

  for (let row = 0; row < gridDim; row++) {
    for (let col = 0; col < gridDim; col++) {
      if (grid[row][col] === 0) { // Show possibilities only for empty cells
        let x = col * cellSize;
        let y = row * cellSize;

        //Divide each cell into a 3x3 grid
        let subCellSize = cellSize/3;
        let values = possibleValues[row][col];

        for(let i=0; i<values.length; i++ ){
          let subRow = floor(i / 3); // Row in the 3x3 grid
          let subCol = i % 3; // Column in the 3x3 grid
          let subX = x + subCol * subCellSize + subCellSize / 2;
          let subY = y + subRow * subCellSize + subCellSize / 2;

          text(values[i], subX, subY);
        }
      }
    }
  }
}

function drawTiles(){

  for (let row = 0; row < gridDim; row++){
      for(let col = 0; col < gridDim; col++){

          //Draw only if a value is assigned
          if(grid[row][col] !== 0){
              image(tiles[grid[row][col]-1], col* cellSize , row* cellSize, cellSize, cellSize);
          }
      }
  }
}