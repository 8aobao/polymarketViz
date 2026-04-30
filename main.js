// IMAGE DRAG TRAIL

const ORACLE_IMAGES = [
  "oracles/DP-15583-020.jpg","oracles/DP-17777-001.jpg","oracles/DP-19531-098.jpg",
  "oracles/DP-24050-001.jpg","oracles/DP-25977-001.jpg","oracles/DP-30186-001.jpg",
  "oracles/DP145924.jpg","oracles/DP164867.jpg","oracles/DP234687.jpg",
  "oracles/DP278472.jpg","oracles/DP311785.jpg","oracles/DP810129.jpg",
  "oracles/DP822411.jpg","oracles/DP824471.jpg","oracles/DT11757.jpg",
  "oracles/DT3621.jpg","oracles/DT6724.jpg","oracles/DT738.jpg","oracles/DT8825.jpg",
  "oracles/David_-_The_Death_of_Socrates.jpg","oracles/EP542.jpg",
  "oracles/LC-1982_60_23.jpg","oracles/LC-23_23_01_002.jpg","oracles/LC-55_62ab-1.jpg",
  "oracles/Les_salons_au_XVIIIe_siècle_-_Histoire_Image.jpg",
  "oracles/Raffaello_-_Spozalizio_-_Web_Gallery_of_Art.jpg",
  "oracles/The_School_of_Athens__by_Raffaello_Sanzio_da_Urbino-scaled.jpg",
  "oracles/catholicism1.webp","oracles/delphi.jpg","oracles/delphi2.webp",
  "oracles/main-image (1).jpeg","oracles/main-image (2).jpeg","oracles/main-image (3).jpeg",
  "oracles/main-image (4).jpeg","oracles/main-image (5).jpeg","oracles/main-image (6).jpeg",
  "oracles/main-image (7).jpeg","oracles/main-image (8).jpeg","oracles/main-image (9).jpeg",
  "oracles/main-image (10).jpeg","oracles/main-image (11).jpeg","oracles/main-image.jpeg",
  "oracles/restricted.jpeg",
];

const trailContainer = document.getElementById("trail");
let oraclePairs = [];
let lastLabel = null;


document.addEventListener("mousemove", (e) => {
  const pairs = oraclePairs.length ? oraclePairs : ORACLE_IMAGES.map(img => ({ image: img, question: "" }));
  const pair  = pairs[Math.floor(Math.random() * pairs.length)];

  const wrapper = document.createElement("div");
  wrapper.className = "trail-wrapper";
  wrapper.style.left = `${e.clientX}px`;
  wrapper.style.top  = `${e.clientY}px`;

  const img = document.createElement("img");
  img.className = "trail-img";
  img.src = pair.image;
  wrapper.appendChild(img);

  const label = document.createElement("div");
  label.className = "trail-label";
  label.textContent = pair.question;
  label.style.left = `${e.clientX + window.innerWidth * 0.09}px`;
  label.style.top  = `${e.clientY}px`;

  if (lastLabel) lastLabel.classList.remove("trail-label--latest");
  label.classList.add("trail-label--latest");
  lastLabel = label;

  trailContainer.appendChild(wrapper);
  trailContainer.appendChild(label);
  setTimeout(() => {
    if (lastLabel === label) lastLabel = null;
    wrapper.remove();
    label.remove();
  }, 3000);
});


// API CALLs + OTHER RELATED THINGS

const GAMMA_API = "https://corsproxy.io/?url=https://gamma-api.polymarket.com";
const DATA_API  = "https://data-api.polymarket.com";

async function fetchMarkets() {
  const url = `${GAMMA_API}/markets?limit=45&order=volume24hr&ascending=false`;
  const res = await fetch(url);
  const markets = await res.json();

  oraclePairs = markets.map((m, i) => ({
    image:    ORACLE_IMAGES[i % ORACLE_IMAGES.length],
    question: m.question,
  }));

  const m = markets[0];
  return {
    question:    m.question,
    conditionId: m.conditionId,
    outcomes:    JSON.parse(m.outcomes),
    volume24hr:  m.volume24hr,
    slug:        m.slug,
  };
}

async function fetchTrades(conditionId) {
  const named = [];
  let offset = 0;
  while (named.length < 2000) {
    const res   = await fetch(`${DATA_API}/trades?market=${conditionId}&limit=100&offset=${offset}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    named.push(...batch.filter(t => t.name || t.pseudonym));
    if (batch.length < 100) break;
    offset += 100;
  }
  return named.slice(0, 2000);
}


async function main() {
  const root = document.getElementById("root");
  try {
    root.textContent = "Fetching top market by 24hr volume…";
    const market = await fetchMarkets();

    root.textContent = `Fetching trades for "${market.question}"…`;
    const trades = await fetchTrades(market.conditionId);

    renderViz(trades);
  } catch (err) {
    root.textContent = "Error: " + err.message;
    console.error(err);
  }
}

main();


// NAMES

let tradeVolMax = 1;

function volToWght(vol) {
  if (vol <= 0) return 0;
  // log normaizled 
  const norm = Math.log(vol + 1) / Math.log(tradeVolMax + 1);
  return 20 * Math.pow(norm, 1.5);
}

function displayName(t) {
  return (t.name && !t.name.startsWith("0x")) ? t.name : t.pseudonym;
}

const tooltip = document.getElementById("tooltip");

function makeCell(t) {
  const cell = document.createElement("div");
  cell.className = "name-cell";
  cell.textContent = displayName(t);
  cell.dataset.side = t.side;

  const text = `$${(t.size * t.price).toFixed(2)}  ·  ${t.outcome} ${(t.price * 100).toFixed(1)}%`;
  const vol  = t.size * t.price;
  const wght = volToWght(vol);
  cell.addEventListener("mouseenter", () => {
    tooltip.textContent = text;
    tooltip.style.fontVariationSettings = `"wght" ${wght}`;
    tooltip.style.display = "block";
    console.log("vol:", vol.toFixed(4), "wght:", wght.toFixed(4), "tradeVolMax:", tradeVolMax);
  });
  cell.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

  return cell;
}

function setGrid(root, cols, rows, fontVw) {
  root.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  root.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;
  root.style.fontSize            = `${fontVw}vw`;
}


// changing type size
function fontForCols(cols) {
  return 100 / (cols * 10);
}

function rowsForCols(cols) {
  const fontPx = fontForCols(cols) * window.innerWidth / 100;
  return Math.floor(window.innerHeight / (fontPx * 1.3));
}

function renderViz(trades) {
  tradeVolMax = Math.max(1, ...trades.map(t => t.size * t.price));
  console.log("tradeVolMax:", tradeVolMax);
  const root = document.getElementById("root");
  root.innerHTML = "";

  const buildSteps = [1, 2, 4, 8];
  let step = 0;
  let tradeIndex = 0;

  function buildTick() {
    const cols  = buildSteps[step];
    const rows  = rowsForCols(cols);
    const count = cols * rows;

    setGrid(root, cols, rows, fontForCols(cols));
    root.innerHTML = "";

    const slice = trades.slice(tradeIndex, tradeIndex + count);
    for (const t of slice) root.appendChild(makeCell(t));
    tradeIndex += slice.length;

    step++;
    if (step < buildSteps.length) {
      setTimeout(buildTick, 2000);
    } else {
      setTimeout(() => pageTick(trades, tradeIndex), 2000);
    }
  }

  buildTick();
}

function pageTick(trades, offset) {
  const root  = document.getElementById("root");
  const cols  = 8;
  const rows  = rowsForCols(8);
  const count = cols * rows;

  setGrid(root, cols, rows, fontForCols(cols));
  root.innerHTML = "";

  const end   = offset + count;
  const slice = end <= trades.length
    ? trades.slice(offset, end)
    : [...trades.slice(offset), ...trades.slice(0, end - trades.length)];
  for (const t of slice) root.appendChild(makeCell(t));

  const next = offset + count;
  setTimeout(() => pageTick(trades, next < trades.length ? next : 0), 2000);
}
