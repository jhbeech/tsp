import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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


function applyLocalSearchTwoOpti(coordinates: Coordinate[], thresh: number, maxIt: number) {
    let searchCoords = [...coordinates]
    let improvementFound = true;
    let count = 0
    while (improvementFound && count < maxIt) {
        improvementFound = false;
        for (let currentNode = 0; currentNode < coordinates.length - 1; currentNode++) {
            let bestImprovementNode = -1;
            let currentNodeImprovement = 0;
            // should this go all the way up to currentNode + coordinates.length?
            // currently fromNode = last node is not being solved
            // 
            for (let swapNode = currentNode + 1; swapNode < coordinates.length; swapNode++) {
                let currentDelta = getlengthDelta(searchCoords, currentNode, swapNode)
                if (currentDelta < - thresh) {
                    improvementFound = true;
                    if (currentDelta < currentNodeImprovement) {
                        currentNodeImprovement = currentDelta;
                        bestImprovementNode = swapNode;
                    }
                }
                count += 1;
            }
            if (currentNodeImprovement < -thresh) {
                searchCoords = applyTwoOptSwap(searchCoords, currentNode, bestImprovementNode);
            }
        }
    }



    return searchCoords
}
// tsp_4461_1
const filePath = join(__dirname, 'data/tsp_33810_1');
const inputCoordinates = parseFileToCoordinates(filePath);

const greedySol = getGreedySolution(inputCoordinates);


// const v1 = 30;
// const v2 = 198;
// const delta = getlengthDelta(greedySol, v1, v2);

// const totDist = getTotalDistance(greedySol);
// const swappedSol = applyTwoOptSwap(greedySol, v1, v2);

// check delta calc works
// console.log(totDist + delta - getTotalDistance(swappedSol));

// console.log(greedySol.length);

let twoOptSol = applyLocalSearchTwoOpti(greedySol, 1e-10, 1e12);

console.log(getTotalDistance(greedySol));
console.log(getTotalDistance(twoOptSol));

const greedyJsonString = JSON.stringify(greedySol, null, 2);
writeFileSync('greedy.json', greedyJsonString, 'utf8');

const twoOptJsonString = JSON.stringify(twoOptSol, null, 2);
writeFileSync('twoOpt.json', twoOptJsonString, 'utf8')

// console.log(twoOptSol.length);
// console.log(twoOptSol);
