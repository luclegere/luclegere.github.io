window.addEventListener('load', main);


"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      reset();
      start();
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
        console.log("uncover", row, col);
        // if coordinates invalid, refuse this request
        if( ! this.validCoord(row,col)) return false;
        // if this is the very first move, populate the mines, but make
        // sure the current cell does not get a mine
        if( this.nuncovered === 0)
          this.sprinkleMines(row, col);
        // if cell is not hidden, ignore this move
        if( this.arr[row][col].state !== STATE_HIDDEN) return false;
        // floodfill all 0-count cells
        const ff = (r,c) => {
          if( ! this.validCoord(r,c)) return;
          if( this.arr[r][c].state !== STATE_HIDDEN) return;
          this.arr[r][c].state = STATE_SHOWN;
          this.nuncovered ++;
          if( this.arr[r][c].count !== 0) return;
          

          ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
          ff(r  ,c-1);         ;ff(r  ,c+1);
          ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
        };
        ff(row,col);
        // have we hit a mine?
        if( this.arr[row][col].mine) {
          this.exploded = true;
        }
        return true;
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;

})();


//set scene with max number of DOMs

function prepare_dom(s) {
  const blockContainer = document.querySelector(".blockContainer");
  let nCols = s.cols;
  let nRows = s.rows;
  let nBlocks = nCols * nRows;
  let blockSize = blockContainer.clientWidth / nCols;
  //const nBlocks = s.cols * s.rows;
  //const blocks = []; 
  detect(s);

  if (s.device === "mobile") {
    blockContainer.style.width = "90vw";
    blockContainer.style.gridTemplateColumns = `repeat(${nCols}, ${blockSize}px)`;
    blockContainer.style.gridTemplateRows = `repeat(${nRows}, ${blockSize}px)`; 
  }
  else {
    blockContainer.style.gridTemplateColumns = `repeat(${nCols}, ${blockSize}px)`;
    blockContainer.style.gridTemplateRows = `repeat(${nRows}, ${blockSize}px)`;   
  }
  for (let i = 0; i < nBlocks; i++) {
    const block = document.createElement('div');

    block.className = "block";
    block.setAttribute("data-blockInd", i);
    block.setAttribute("data-blockRow", Math.floor(i / s.cols));
    block.setAttribute("data-blockCol", i % s.cols);
  //  block.innerHTML = i;
    //block.className = "block";
    block.classList.add("btn");
    block.dataset.key = i;


    blockContainer.append(block);
    /*block.addEventListener("click", () => {
        block_click_cb(s, );
    });*/
    
  }
  
  
  


  /*blockContainer.addEventListener('contextmenu', (e) => {
      if (e.target && e.target.classList.contains("btn")) {

        block_rightclick_cb(s, e.target.getAttribute("data-blockRow"), e.target.getAttribute("data-blockCol"));
        press(s, e.target.getAttribute("data-blockRow"), e.target.getAttribute("data-blockCol"));
      }
      e.preventDefault();
  });*/

  if (s.device === "mobile") {
    var clicklength = 0;
    //let flagdrop = false;
    blockContainer.addEventListener('touchstart', (e) => {
      let row = e.target.getAttribute("data-blockRow");
      let col = e.target.getAttribute("data-blockCol");
      if (e.target && e.target.classList.contains("btn")) {
        clicklength = window.setTimeout(function() {block_rightclick_cb(s, row, col)}, 1500);
        $(e.target).mouseup(function() {
          clearTimeout(clicklength);
          block_click_cb(s, row, col);
          return false;
        });
      }
    });
  }

  else {
    blockContainer.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains("btn")) {
        block_click_cb(s, e.target.getAttribute("data-blockRow"), e.target.getAttribute("data-blockCol"));
    }

    });
    blockContainer.addEventListener('contextmenu', (e) => {
      if (e.target && e.target.classList.contains("btn")) {

        block_rightclick_cb(s, e.target.getAttribute("data-blockRow"), e.target.getAttribute("data-blockCol"));
      }
      e.preventDefault();
  });
  }
}




function block_click_cb(s, row, col) {
    console.log(s.game.getRendering().join("\n"));
    row = Number(row);
    col = Number(col);
    s.game.uncover(row, col);
   // s.game.uncover(row, col);
    console.log(row, col);
    render(s);
    if (s.game.nuncovered === s.game.nrows * s.game.ncols - s.game.nmines) {

        console.log("win");
        document.querySelector("#overlay").classList.toggle("active");
        document.querySelector("#overlay").style.color = "white";
        document.querySelector("#overlay").innerHTML = "You Win! Click Anywhere to Play Again!";
  
  
    }
    else if (s.game.exploded) {
      document.querySelector("#overlay").classList.toggle("active");
      document.querySelector("#overlay").style.color = "white";
      document.querySelector("#overlay").innerHTML = "Oh No, You Hit A Mine! Click Anywhere To Retry";


    }

}



function block_rightclick_cb(s, row, col) {
    s.game.mark(row, col);
    render(s);
    console.log(s.game.getStatus());
    console.log(s.game.getRendering().join("\n"));
}



function render(s) {
    
    //create appropriate number/size of blocks in container
    const blockContainer = document.querySelector(".blockContainer");

    let blockSize = blockContainer.clientWidth / s.cols;
    if (s.device === "mobile") {
      blockContainer.style.width = "90vw";

      blockContainer.style.gridTemplateColumns = `repeat(${s.cols}, ${blockSize}px)`;
      blockContainer.style.gridTemplateRows = `repeat(${s.rows}, ${blockSize}px)`;
    }
    else {
      blockContainer.style.gridTemplateColumns = `repeat(${s.cols}, ${blockSize}px)`;
      blockContainer.style.gridTemplateRows = `repeat(${s.rows}, ${blockSize}px)`;
    }
    
    //handle new game
    if (s.newgame === true) {
      
        for (let i = 0; i < blockContainer.children.length; i++) {
            blockContainer.children[i].innerHTML = "";
            blockContainer.children[i].backgroundImage = null;
        }
        s.newgame = false;
    }

    //set attributes of blocks
    for (let i = 0; i < blockContainer.children.length; i++) {
        const block = blockContainer.children[i];
        if (blockContainer.children.length < 100) { //fix this
            block.style.textAlign = "center";
            block.style.fontSize = "xx-large";
        }
        else block.style.fontSize = "x-large";


        //set block rows/cols based on index
        const ind = Number(block.getAttribute("data-blockInd"));
        block.setAttribute("data-blockRow", Math.floor(ind / s.cols));
        block.setAttribute("data-blockCol", ind % s.cols);
        
        //only render blocks needed for difficulty
        if (ind >= s.rows * s.cols) {
            block.style.display = "none";
        }
        else { 
            block.style.display = "block";
        }

        //set colours/style of board
        if (block.getAttribute("data-blockCol") % 2 === 0) {
            if (block.getAttribute("data-blockRow") % 2 === 0) {
                block.style.backgroundColor = "black";
                block.setAttribute("data-blockSty", "dark");
            }
            else {
                block.style.backgroundColor = "white";
                block.setAttribute("data-blockSty", "light");
            }
        }
        else {
            if (block.getAttribute("data-blockRow") % 2 === 0) {
                block.style.backgroundColor = "white";
                block.setAttribute("data-blockSty", "light");
            }
            else { 
                block.style.backgroundColor = "black";
                block.setAttribute("data-blockSty", "dark");
            }   

        }
        //set flags remaining text
        document.getElementById("remaining").innerHTML = (s.game.nmines - s.game.nmarked).toString();
        
    }  

    //update colours of blocks if necessary
    //check for game ending conditions
    for (let i = 0; i < s.rows; i++) {
        for (let j = 0; j < s.cols; j++) {

            const block = blockContainer.children[i * s.cols + j];
            let row = block.getAttribute("data-blockRow");
            let col = block.getAttribute("data-blockCol");
            let sty = block.getAttribute("data-blockSty");
            let arr = s.game.arr;
            let a = arr[row][col];
            //game is over; lost
            if (s.game.exploded && a.mine) {
                stop();
                console.log("done");
                block.style.backgroundImage = "url('mine.png')";
            }
            //block is flagged
            else if (a.state === "marked") 
                block.style.backgroundImage = "url('flag.png')";
            //block is not uncovered
            else if (a.state === "hidden") 
                block.style.backgroundImage = "";

            else if (a.mine);   //fix lol
            
            else {
                //update colours of blocks, text
                if (block.getAttribute("data-blockSty") === "dark") {
                    block.style.backgroundColor = "grey";
                }
                else {
                    block.style.backgroundColor = "lightgrey";
                }
                if (a.count === 1)
                    block.style.color = "blue";
                else if (a.count === 2) 
                    block.style.color = "red";
                else if (a.count === 3) 
                    block.style.color = "cyan";
                else if (a.count === 4) 
                    block.style.color = "purple";
                else if (a.count === 5)
                    block.style.color = "magenta";
                else if (a.count === 6)
                    block.style.color = "blue";
                else if (a.count === 7)
                    block.style.backgroundImage = "red";
                else if (a.count === 8)
                    block.style.backgroundImage = "cyan";
                if (a.count !== 0) {
                    block.innerHTML = a.count.toString();
                }
            }
        }   
    }

}

//fix - remove param
/**
 * Function to start timer
 * @param  s - scene
 */
function start(s) {
    let t = 0;
    timer = setInterval(function() {
        t++;
        document.getElementById("timer").innerHTML = ('000' + t).substr(-3);
    }, 1000);
}

/**
 * stop timer
 */
function stop() {
    if (timer) window.clearInterval(timer);

}

/**
 * reset timer
 */
function reset() {
    if (timer) window.clearInterval(timer);
    document.getElementById("timer").innerHTML = ('000');

}

/**
 * start an easy game
 * @param {} s scene
 */
function easy(s) {
    //reset timer
    console.log(s.device);
    reset();
    //set columns, rows, mines
    s.cols = 10;
    s.rows = 8;
    s.mines = 10;
    s.minesRemaining = 10;
    s.difficulty = "easy";
    document.getElementById("remaining").innerHTML = s.minesRemaining.toString();

    //start and initialize game
    let game = new MSGame();
    game.init(s.rows, s.cols, s.mines);
    s.game = game;
    s.newgame = true;

    render(s);
}

/**
 * start a medium game
 * @param {} s scene
 */
function medium(s) {
    //reset game
    reset();
    s.cols = 18;
    s.rows = 14;
    s.mines = 40;
    s.minesRemaining = 40;
    s.difficulty = "medium";
    document.getElementById("remaining").innerHTML = s.minesRemaining.toString();
    
    let game = new MSGame();
    game.init(s.rows, s.cols, s.mines);
    s.game = game;
    s.newgame = true;

    render(s);
}


function detect(s) {
  if (/Mobi/.test(navigator.userAgent) )
  {
    s.device = "mobile";
  }
  else {
    s.device = "pc";
  }
}




//main function

function main() {
    //initilaize state
    let state = {
        cols: 18,
        rows: 18,
        mines: 10,
        minesRemaining: 40,
        game: null,
        newgame: null,
        difficulty: "easy",
        device: null
    }
    detect(state);
   // detect(state);
    let timer = null;
    let html = document.querySelector("html");
    //prepare doms
    prepare_dom(state);
    //start an easy game to begin
    easy(state);

    //add listeners for buttons and overlay
    document.getElementById("easyButton").addEventListener("click", () => {
        stop();
        easy(state);
    });
    document.getElementById("mediumButton").addEventListener("click", () => {
        
        stop();
        medium(state);
    });
    document.querySelector("#overlay").addEventListener("click", () => {
        document.querySelector("#overlay").classList.remove("active");
        if (state.difficulty === "easy")
            easy(state);
        else medium(state);
    });
    
    


}



//console.log(game.getRendering().join("\n"));


