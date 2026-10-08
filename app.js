const INFO = {
  bubble:{name:"Bubble sort",
    text:"Walks through the list and swaps neighbours that are in the wrong order. After each pass, the largest remaining value has bubbled to the end.",
    best:"O(n)",avg:"O(n²)",worst:"O(n²)",space:"O(1)"},
  selection:{name:"Selection sort",
    text:"Finds the smallest value in the unsorted part and swaps it to the front. Repeats until everything is placed.",
    best:"O(n²)",avg:"O(n²)",worst:"O(n²)",space:"O(1)"},
  insertion:{name:"Insertion sort",
    text:"Takes the next value and slides it left until it sits in the right spot, like sorting playing cards in your hand.",
    best:"O(n)",avg:"O(n²)",worst:"O(n²)",space:"O(1)"},
  merge:{name:"Merge sort",
    text:"Splits the list in halves, sorts each half, then merges the two sorted halves back together. A classic divide and conquer algorithm.",
    best:"O(n log n)",avg:"O(n log n)",worst:"O(n log n)",space:"O(n)"},
  quick:{name:"Quick sort",
    text:"Picks a pivot, moves smaller values to its left and larger values to its right, then sorts each side the same way.",
    best:"O(n log n)",avg:"O(n log n)",worst:"O(n²)",space:"O(log n)"}
};

const $ = id => document.getElementById(id);
const stage = $("stage");
let arr = [], state = [], bars = [];
let current = "bubble", running = false, token = 0;
let comps = 0, writes = 0, t0 = 0, timer = null;

class Cancelled extends Error {}

function makeArray(){
  const n = +$("size").value;
  arr = Array.from({length:n}, (_, i) => i + 1);
  for(let i = n - 1; i > 0; i--){           // Fisher-Yates shuffle
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  state = new Array(n).fill("");
  stage.innerHTML = "";
  bars = arr.map(() => {
    const d = document.createElement("div");
    d.className = "bar";
    stage.appendChild(d);
    return d;
  });
  resetStats();
  render();
}

function render(){
  const max = arr.length;
  for(let i = 0; i < arr.length; i++){
    bars[i].style.height = (arr[i] / max * 100) + "%";
    bars[i].className = "bar " + state[i];
  }
}

function resetStats(){
  comps = 0; writes = 0;
  $("comps").textContent = 0; $("writes").textContent = 0; $("time").textContent = "0.0s";
}

function delay(){
  const s = +$("speed").value;
  return Math.pow(1 - s / 100, 2) * 250;    // 0 to 250 ms
}

async function tick(my){
  render();
  const d = delay();
  await new Promise(r => setTimeout(r, d));
  if(my !== token) throw new Cancelled();
}

function count(){
  $("comps").textContent = comps;
  $("writes").textContent = writes;
}

// Compare two positions. Returns arr[i] - arr[j].
async function compare(i, j, my){
  comps++; count();
  state[i] = state[j] = "cmp";
  await tick(my);
  const r = arr[i] - arr[j];
  state[i] = state[j] = "";
  return r;
}

async function swap(i, j, my){
  writes++; count();
  [arr[i], arr[j]] = [arr[j], arr[i]];
  state[i] = state[j] = "act";
  await tick(my);
  state[i] = state[j] = "";
}

async function bubble(my){
  const n = arr.length;
  for(let end = n - 1; end > 0; end--){
    let swapped = false;
    for(let i = 0; i < end; i++){
      if(await compare(i, i + 1, my) > 0){ await swap(i, i + 1, my); swapped = true; }
    }
    state[end] = "done";
    if(!swapped){ for(let k = 0; k < end; k++) state[k] = "done"; return; }
  }
  state[0] = "done";
}

async function selection(my){
  const n = arr.length;
  for(let i = 0; i < n - 1; i++){
    let min = i;
    for(let j = i + 1; j < n; j++){
      if(await compare(j, min, my) < 0) min = j;
    }
    if(min !== i) await swap(i, min, my);
    state[i] = "done";
  }
  state[n - 1] = "done";
}

async function insertion(my){
  const n = arr.length;
  for(let i = 1; i < n; i++){
    let j = i;
    while(j > 0 && await compare(j - 1, j, my) > 0){
      await swap(j - 1, j, my);
      j--;
    }
  }
}

async function merge(my){
  async function sort(lo, hi){
    if(hi - lo < 1) return;
    const mid = (lo + hi) >> 1;
    await sort(lo, mid);
    await sort(mid + 1, hi);
    const left = arr.slice(lo, mid + 1), right = arr.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while(i < left.length && j < right.length){
      comps++; count();
      state[lo + i] = "cmp"; state[mid + 1 + j] = "cmp";
      await tick(my);
      state[lo + i] = ""; state[mid + 1 + j] = "";
      arr[k] = left[i] <= right[j] ? left[i++] : right[j++];
      writes++; count(); state[k] = "act"; await tick(my); state[k] = ""; k++;
    }
    while(i < left.length){ arr[k] = left[i++]; writes++; count(); state[k] = "act"; await tick(my); state[k] = ""; k++; }
    while(j < right.length){ arr[k] = right[j++]; writes++; count(); state[k] = "act"; await tick(my); state[k] = ""; k++; }
  }
  await sort(0, arr.length - 1);
}

async function quick(my){
  async function sort(lo, hi){
    if(lo >= hi){ if(lo === hi) state[lo] = "done"; return; }
    state[hi] = "act";                       // pivot
    let p = lo;
    for(let i = lo; i < hi; i++){
      if(await compare(i, hi, my) < 0){
        if(i !== p){ const keep = state[hi]; await swap(i, p, my); state[hi] = keep; }
        p++;
      }
    }
    if(p !== hi) await swap(p, hi, my);
    state[hi] = ""; state[p] = "done";
    await sort(lo, p - 1);
    await sort(p + 1, hi);
  }
  await sort(0, arr.length - 1);
}

const ALGOS = {bubble, selection, insertion, merge, quick};

function showInfo(){
  const a = INFO[current];
  $("info").innerHTML =
    `<h2>${a.name}</h2><p>${a.text}</p>
     <table><tr><th>Best</th><th>Average</th><th>Worst</th><th>Extra space</th></tr>
     <tr><td>${a.best}</td><td>${a.avg}</td><td>${a.worst}</td><td>${a.space}</td></tr></table>`;
}

function setRunning(on){
  running = on;
  $("sort").disabled = on;
  $("shuffle").disabled = on;
  $("size").disabled = on;
  $("stop").disabled = !on;
  document.querySelectorAll("#algos button").forEach(b => b.disabled = on);
}

async function start(){
  if(running) return;
  state.fill(""); resetStats(); render();
  const my = ++token;
  setRunning(true);
  t0 = performance.now();
  timer = setInterval(() => $("time").textContent = ((performance.now() - t0) / 1000).toFixed(1) + "s", 100);
  try{
    await ALGOS[current](my);
    // final sweep so every bar ends green
    for(let i = 0; i < arr.length; i++){
      state[i] = "done";
      if(i % 2 === 0) await tick(my);
    }
    render();
  }catch(e){
    if(!(e instanceof Cancelled)) throw e;
    state.fill(""); render();
  }finally{
    clearInterval(timer);
    $("time").textContent = ((performance.now() - t0) / 1000).toFixed(1) + "s";
    setRunning(false);
  }
}

// Wire up the page
const algoBox = $("algos");
Object.keys(INFO).forEach(key => {
  const b = document.createElement("button");
  b.textContent = INFO[key].name;
  b.setAttribute("aria-pressed", key === current);
  b.onclick = () => {
    current = key;
    algoBox.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    showInfo();
  };
  algoBox.appendChild(b);
});

$("sort").onclick = start;
$("stop").onclick = () => { token++; };
$("shuffle").onclick = makeArray;
$("size").oninput = () => { if(!running) makeArray(); };

showInfo();
makeArray();