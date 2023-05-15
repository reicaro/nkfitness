import React, { useState, useEffect, useMemo, useRef } from 'react';
import 'tailwindcss/tailwind.css';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart, registerables } from "chart.js";

Chart.register(...registerables);

function Plot({ data }) {
  const chartData = {
    labels: Array.from({length: data.length}, (_, i) => i + 1),
    datasets: [
      {
        label: 'Fitness Over Generations',
        data: data,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  return (
    <div className="w-full h-[390px]">
      <Line data={chartData} options={{ scales: { x: { display: true }, y: { display: true } } }} />
    </div>
  );
}


function createGenome(N, A, K, genotype, hashWs, kOthers) {
  return new Genome(N, A, K, genotype, hashWs, kOthers);
}

function Genome(n, a, k, genotype, hashWs, kOthers, mutationRate = 0.1) {
  this.n = n;
  this.a = a;
  this.k = k;
  this.mutationRate = mutationRate;
  this.genotype = genotype === null
    ? Array.from({ length: n }, () => Math.floor(Math.random() * a))
    : genotype;
  this.hash = g2h(this.genotype, a);
  this.ws = hashWs[this.hash];

  this.fitness = function() {
    const fitnesses = Array.from({ length: this.n }, () => 0);
    for (let i = 0; i < this.n; i++) {
      if (this.k !== 0) {
        const sum = kOthers[i].map(j => this.ws[j]).reduce((a, b) => a + b, 0);
        fitnesses[i] = (sum + this.ws[i]) / this.k;
      } else {
        fitnesses[i] = this.ws[i];
      }
    }
    return fitnesses.reduce((a, b) => a + b, 0) / this.n;
  }

  this.getMutants = function() {
    const mutants = [];
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.a; j++) {
        if (this.genotype[i] === j) {
          continue;
        }
        const newGenotype = [...this.genotype];
        newGenotype[i] = j;
        mutants.push(newGenotype);
      }
    }
    return mutants;
  }
}

function SimplePlot({ data }, ref) {
  // A very simple plot, not to scale
  return (
    <div>
      {data.map((value, index) => (
        <div key={index} ref={index === data.length - 1 ? ref : null}>
          {Number.isFinite(value) && value >= 0
            ? Array(Math.round(value * 100)).fill('*').join('')
            : 'Invalid value'}
        </div>
      ))}
    </div>
  );
}

function randomChoices(array, k) {
  const result = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * array.length);
    result.push(array[randomIndex]);
  }
  return result;
}

function generateHashWs(N, A) {
  const d = {};
  for (let i = 0; i <= Math.pow(A, N) - 1; i++) { // Notice the change here
    d[i] = Array.from({ length: N }, () => Math.random());
  }
  return d;
}


function g2h(genotype, A) {
  let h = 0;
  for (let i = 0; i < genotype.length; i++) {
    h += genotype[i] * Math.pow(A, i);
  }
  return h;
}

function generateKOthers(N, K) {
  const l = [];
  for (let i = 0; i < N; i++) {
    const band = Array.from({ length: N }, (_, j) => j).filter(j => i !== j);
    const choices = randomChoices(band, K);
    l.push(choices);
  }
  return l;
}

function nextGen(genomeDict) {
  const newGenomeDict = new Map();
  for (const [oldGenome, portion] of genomeDict) {
    const newPortionRaw = portion * oldGenome.fitness();
    const newPortion = newPortionRaw * (1 - oldGenome.mutationRate);
    newGenomeDict.set(oldGenome, newPortion);

    const newGenotypes = oldGenome.getMutants();
    for (const newGenotype of newGenotypes) {
      const hashWs = generateHashWs(oldGenome.n, oldGenome.a); // Recalculate hashWs
      const kOthers = generateKOthers(oldGenome.n, oldGenome.k); // Recalculate kOthers
      newGenomeDict.set(new Genome(oldGenome.n, oldGenome.a, oldGenome.k, newGenotype, hashWs, kOthers, oldGenome.mutationRate), newPortionRaw * oldGenome.mutationRate / newGenotypes.length);
    }
  }

  for (const [newGenome, newPortion] of newGenomeDict) {
    if (newPortion < 0.01) {
      newGenomeDict.delete(newGenome);
    }
  }

  const totalPop = Array.from(newGenomeDict.values()).reduce((a, b) => a + b, 0);
  for (const genome of newGenomeDict.keys()) {
    newGenomeDict.set(genome, newGenomeDict.get(genome) / totalPop);
  }

  return newGenomeDict;
}


function avgFitness(gd) {
  let totalFitness = 0;
  for (const [genome, value] of gd) {
    totalFitness += genome.fitness() * value;
  }
  return totalFitness;
}

function GenomeSimulation({ N, K, Speed, onNChange, onKChange, updateLog}) {
  const [fitnesses, setFitnesses] = useState([]);
  const [generation, setGeneration] = useState(0);
  const [genomeDict, setGenomeDict] = useState(new Map());
  const bottomSimulationRef = useRef(null);

  const hashWs = useMemo(() => generateHashWs(N, 2), [N]);
  const kOthers = useMemo(() => generateKOthers(N, K), [N, K]);

  useEffect(() => {
    const initialGenome = createGenome(N, 2, K, null, hashWs, kOthers);
    const newGenomeDict = new Map();
    newGenomeDict.set(initialGenome, 1.0);
    setGenomeDict(newGenomeDict);
    setFitnesses([]);  // Reset fitnesses
    setGeneration(0);  // Reset generation
  }, [N, K, hashWs, kOthers]);  // Reset when N or K changes

  useEffect(() => {
    const evolveGeneration = () => {
      const newGenomeDict = nextGen(genomeDict);
      setGenomeDict(newGenomeDict);
      const averageFitness = avgFitness(newGenomeDict);
      setFitnesses((prev) => [...prev, averageFitness]);
      updateLog(`Generation ${generation + 1}: Average fitness = ${averageFitness.toFixed(2)}`);
      setGeneration((prev) => prev + 1);
    };

    const intervalId = setInterval(evolveGeneration, Speed * 10);

    return () => clearInterval(intervalId);
  }, [N, K, hashWs, kOthers, genomeDict, Speed]);
  return (
    <div>
      <Plot data={fitnesses} />
    </div>
  );
}

function App() {

  const [N, setN] = useState(5);
  const [K, setK] = useState(1);
  const [speed, setSpeed] = useState(10);
  const [log, setLog] = useState([]);
  const [reset, setReset] = useState(false);  // New state variable
  const bottomLogRef = useRef(null);


  useEffect(() => {
      if (bottomLogRef.current) {
          bottomLogRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [log]);  // Update the scroll position every time the log changes


  const updateLog = (message) => {
    setLog(prevLog => [...prevLog, message]);
  };

  const resetSimulation = () => {
    setN(N > 5 ? N - 1 : N + 1);
    setK(1);
    setLog([]);
    setReset(prevReset => !prevReset);
  };




  return (
    <div className="relative bg-neutral-50 w-full min-h-screen flex flex-col md:flex-row items-start justify-start text-left text-sm text-gray-700 font-inter">
      <div className="self-stretch flex-1 flex flex-col p-8 items-start justify-between">
        <div className="w-full md:w-auto flex flex-col items-start justify-start text-[28px]">
          <div className="self-stretch relative tracking-[-0.01em] leading-[38px] font-semibold">
            Interactive Simulation
          </div>
          <div className="self-stretch relative text-[16px] tracking-[-0.1px] leading-[24px] text-gray-50">
            NK Fitness Simulation
          </div>
        </div>
        <div className="self-stretch flex flex-col md:flex-row items-start justify-start">
          <div className="flex-grow rounded-lg h-[427px] flex flex-col items-start justify-start gap-[12px]">
            <div className="self-stretch relative tracking-[-0.1px] leading-[20px] font-medium">
              Live Landscape
            </div>
            <div className="self-stretch flex-1 flex flex-row py-0 pl-0 box-border items-start  h-[427px] justify-start">
              <div className="self-stretch flex-1 flex flex-col items-start justify-start">
                <div
                  className="bg-base-white self-stretch flex-1 h-[395px] rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] border-[1px] border-solid border-neutral-700"
                >
                  <div className="w-[1000x] h-[395px] overflow-auto">
                    <GenomeSimulation N={N} K={K} Speed={speed} onNChange={setN} onKChange={setK} updateLog={updateLog}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg w-full md:w-[339px] h-[427px] flex flex-col items-start justify-start gap-[12px] mt-4 ml-16 md:mt-0 md:ml-16">
            <div className="self-stretch relative tracking-[-0.1px] leading-[20px] font-medium">
              Omitted Events
            </div>
            <div className="self-stretch flex-1 flex flex-row items-start justify-start">
              <div className="self-stretch flex-1 flex flex-col items-start justify-start">
              <div className="bg-base-white h-[395px] px-4 overflow-y-auto self-stretch rounded-md scrollbar-hide shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] overflow-hidden border-[1px] border-solid border-neutral-700">
                {log.map((message, index) => (
                  <p key={index} className="my-1" ref={index === log.length - 1 ? bottomLogRef : null}>
                    {message}
                  </p>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
        <div className="self-stretch flex flex-col items-start justify-start gap-[38px]">
            <div className="self-stretch flex flex-row items-start justify-start gap-[64px]">
              <div className="flex-1 flex flex-col items-start justify-start gap-[8px]">
                <div className="self-stretch relative tracking-[-0.1px] leading-[20px] font-medium">
                  N value (Definition)
                </div>
                <input
                  className="font-inter text-mini bg-base-white self-stretch rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] box-border h-[46px] overflow-hidden shrink-0 flex flex-row py-3 px-4 items-center justify-start border-[1px] border-solid border-neutral-700"
                  type="number"
                  placeholder="Enter Value"
                  required
                  value={N}
                  onChange={(e) => setN(parseInt(e.target.value, 10))}
                />
              </div>
              <div className="flex-1 flex flex-col items-start justify-start gap-[8px]">
                <div className="self-stretch relative tracking-[-0.1px] leading-[20px] font-medium">
                  K (Definition)
                </div>
                <input
                  className="font-inter text-mini bg-base-white self-stretch rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] box-border h-[46px] overflow-hidden shrink-0 flex flex-row py-3 px-4 items-center justify-start border-[1px] border-solid border-neutral-700"
                  type="number"
                  placeholder="Enter Value"
                  required
                  value={K}
                  onChange={(e) => setK(parseInt(e.target.value, 10))}
                />
              </div>
              <div className="flex-1 flex flex-col items-start justify-start gap-[8px] w-[200px]">
                <div className="self-stretch relative tracking-[-0.1px] leading-[20px] font-medium">
                  Interval Length
                </div>
                <input
                  className="font-inter text-mini bg-base-white self-stretch rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] box-border h-[46px] overflow-hidden shrink-0 flex flex-row py-3 px-4 items-center justify-start border-[1px] border-solid border-neutral-700"
                  type="number"
                  placeholder="Enter Value"
                  required
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="self-stretch flex flex-row items-center justify-start gap-[24px]">
              <button onClick={resetSimulation} className="cursor-pointer py-3 px-[18px] bg-base-white rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] overflow-hidden flex flex-row items-center justify-center border-[1px] border-solid border-neutral-700">
                <div className="relative text-mini leading-[22px] font-semibold font-inter text-gray-700 text-left">
                  Reset Simulation
                </div>
              </button>
              <button onClick={() => {setK(Math.max(2, Math.floor(Math.random() * 8))); setN(Math.max(2, Math.floor(Math.random() * 8)));}} className="cursor-pointer [border:none] py-3 px-[18px] bg-darkslategray rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] overflow-hidden flex flex-row items-center justify-center">
                <div className="relative text-mini leading-[22px] font-semibold font-inter text-base-white text-left">
                  Randomize Inputs
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default App;
