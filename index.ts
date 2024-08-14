import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sampleSize } from 'lodash';

type Coordinate = [number, number];

function parseFileToCoordinates(filePath: string): Coordinate[] {
    const data = readFileSync(filePath, 'utf-8');
    const lines = data.trim().split('\n');

    const numberOfNodes = parseInt(lines[0]);
    const coordinates: Coordinate[] = [];

    for (let i = 1; i <= numberOfNodes; i++) {
        const [x, y] = lines[i].split(' ').map(Number);
        coordinates.push([x, y]);
    }

    return coordinates;
}

function getDistance(coord1: Coordinate, coord2: Coordinate): number {
    const [x1, y1] = coord1;
    const [x2, y2] = coord2;

    const dx = x2 - x1;
    const dy = y2 - y1;

    return Math.sqrt(dx * dx + dy * dy);
}

function getNearestCoordinate(point: Coordinate, coordinates: Coordinate[]): [
    Coordinate | null,
    number
] {
    if (coordinates.length === 0) {
        return [null, -1];
    }

    let nearestCoordinate: Coordinate = coordinates[0];
    let minDistance = getDistance(point, nearestCoordinate);
    let nearestIndex = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const coord = coordinates[i];
        const distance = getDistance(point, coord);
        if (distance < minDistance) {
            minDistance = distance;
            nearestCoordinate = coord;
            nearestIndex = i;
        }
    }

    return [nearestCoordinate, nearestIndex];
}

function getGreedySolution(coordinates: Coordinate[]): Coordinate[] {
    const greedySol: Coordinate[] = [];

    let startNode = coordinates[0];
    let remainingNodes = coordinates.slice(1);

    while (remainingNodes.length > 0) {
        const [closestNode, closestIdx] = getNearestCoordinate(startNode, remainingNodes);
        if (closestNode === null) {
            break; // No more nodes to process
        }

        greedySol.push(closestNode); // Add the closest node to the path
        startNode = closestNode; // Update the start node
        remainingNodes.splice(closestIdx, 1); // Remove the closest node from remaining nodes
    }

    return greedySol;
}


function getlengthDelta(coordinates: Coordinate[], nodeIdx1: number, nodeIdx2: number) {
    // requires nodeIdx2 > nodeIdx1
    return - getDistance(coordinates[nodeIdx1], coordinates[(nodeIdx1 + 1)])
        - getDistance(coordinates[nodeIdx2], coordinates[(nodeIdx2 + 1) % coordinates.length])
        + getDistance(coordinates[nodeIdx1 + 1], coordinates[(nodeIdx2 + 1) % coordinates.length])
        + getDistance(coordinates[nodeIdx1], coordinates[nodeIdx2])
}


function applyTwoOptSwap(coordinates: Coordinate[], nodeIdx1: number, nodeIdx2: number): Coordinate[] {

    return [
        ...coordinates.slice(0, nodeIdx1 + 1),
        ...coordinates.slice(nodeIdx1 + 1, nodeIdx2 + 1).reverse(),
        ...coordinates.slice(nodeIdx2 + 1)
    ]
}

function getTotalDistance(coordinates: Coordinate[]) {
    if (coordinates.length === 0) return 0;

    let totalDistance = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        totalDistance += getDistance(start, end);
    }
    totalDistance += getDistance(coordinates[coordinates.length - 1], coordinates[0])
    return totalDistance;
}


function applyLocalSearchTwoOpti(coordinates: Coordinate[], thresh: number, maxIt: number, startTime: number) {
    let searchCoords = [...coordinates]
    let improvementFound = true;
    let count = 0
    const logEvery = 100000;
    const maxRunHours = 5;
    while (improvementFound && count < maxIt) {
        improvementFound = false;
        for (let nodeIdx = 0; nodeIdx < coordinates.length - 1; nodeIdx++) {
            let bestImprovementNode = -1;
            let currentNodeImprovement = 0;
            // should this go all the way up to currentNode + coordinates.length?
            // currently fromNode = last node is not being solved
            // 
            for (let neighbourIdx = nodeIdx + 1; neighbourIdx < coordinates.length; neighbourIdx++) {
                let swapDelta = getlengthDelta(searchCoords, nodeIdx, neighbourIdx)
                if (swapDelta < - thresh) {
                    improvementFound = true;
                    if (swapDelta < currentNodeImprovement) {
                        currentNodeImprovement = swapDelta;
                        bestImprovementNode = neighbourIdx;
                    }
                }
                count += 1;
                // if (count % logEvery == 0) {
                //     console.log(count, getTotalDistance(searchCoords));
                // }
            }
            if (currentNodeImprovement < -thresh) {
                searchCoords = applyTwoOptSwap(searchCoords, nodeIdx, bestImprovementNode);
            }
            if (performance.now() - startTime > maxRunHours * 60 * 60 * 1000) {
                break;
            }
        }
    }
    return searchCoords
}


function applySimmulatedAnnealingSearch(coordinates: Coordinate[], iterations: number, initialTemp: number) {
    let seq = [];
    let searchCoords = [...coordinates];
    let count = 0;
    let temp = initialTemp;
    let logEvery = 100000;
    while (count < iterations) {
        let nodes = sampleSize(Array.from(searchCoords.keys()), 2);
        let nodeIdx = Math.min(...nodes);
        let neighbourIdx = Math.max(...nodes);
        let swapDelta = getlengthDelta(searchCoords, nodeIdx, neighbourIdx)
        let rand  = Math.random();
        if (swapDelta < 0 || Math.exp(-swapDelta / temp) > rand) {
            searchCoords = applyTwoOptSwap(searchCoords, nodeIdx, neighbourIdx);
            seq.push(getTotalDistance(searchCoords));
        }
        temp *= (1 - (count + 1) / iterations) ** 0.25
        count += 1;

        if (count % logEvery == 0) {
            console.log(getTotalDistance(searchCoords));
        }

    }
    return searchCoords
}

// tsp_4461_1
//33810
const filePath = join(__dirname, 'data/tsp_1889_1');
const inputCoordinates = parseFileToCoordinates(filePath);


const startTime = performance.now();

const greedySol = getGreedySolution(inputCoordinates);
console.log("greedy", getTotalDistance(greedySol));

const greedyJsonString = JSON.stringify(greedySol, null, 2);
writeFileSync('greedy.json', greedyJsonString, 'utf8');
// const v1 = 30;
// const v2 = 198;
// const delta = getlengthDelta(greedySol, v1, v2);

// const totDist = getTotalDistance(greedySol);
// const swappedSol = applyTwoOptSwap(greedySol, v1, v2);

// check delta calc works
// console.log(totDist + delta - getTotalDistance(swappedSol));

// console.log(greedySol.length);

// assume greedy sol solves within time
const iterations = 10;
let sol = [...greedySol];
for (let i = 0; i < iterations; i++) {
    sol = applySimmulatedAnnealingSearch(sol, 1000000, 500)
    console.log("sim anneal", getTotalDistance(sol));
    const simmAnnealJsonString = JSON.stringify(sol, null)
    writeFileSync('simmAnneal.json', simmAnnealJsonString, 'utf8')
    sol = applyLocalSearchTwoOpti(sol, 1e-10, 1e12, startTime);
    console.log("2 opt", getTotalDistance(sol));
    const twoOptJsonString = JSON.stringify(sol, null, 2);
    writeFileSync('twoOpt.json', twoOptJsonString, 'utf8')
}






