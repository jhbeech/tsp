import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { sampleSize } from "lodash";
import "lodash.combinations";
import _ from "lodash";

type Coordinate = [number, number];

function parseFileToCoordinates(filePath: string): Coordinate[] {
  const data = readFileSync(filePath, "utf-8");
  const lines = data.trim().split("\n");

  const numberOfNodes = parseInt(lines[0]);
  const coordinates: Coordinate[] = [];

  for (let i = 1; i <= numberOfNodes; i++) {
    const [x, y] = lines[i].split(" ").map(Number);
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

function getNearestCoordinate(
  point: Coordinate,
  coordinates: Coordinate[]
): [Coordinate | null, number] {
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
    const [closestNode, closestIdx] = getNearestCoordinate(
      startNode,
      remainingNodes
    );
    if (closestNode === null) {
      break; // No more nodes to process
    }

    greedySol.push(closestNode); // Add the closest node to the path
    startNode = closestNode; // Update the start node
    remainingNodes.splice(closestIdx, 1); // Remove the closest node from remaining nodes
  }

  return greedySol;
}

/**
 * Calculates the change in tour length resulting from a 2-opt swap.
 * The indices must satisfy `nodeIdx2 > nodeIdx1`.
 */
function getlengthDelta(
  coordinates: Coordinate[],
  nodeIdx1: number,
  nodeIdx2: number
) {
  return (
    -getDistance(coordinates[nodeIdx1], coordinates[nodeIdx1 + 1]) -
    getDistance(
      coordinates[nodeIdx2],
      coordinates[(nodeIdx2 + 1) % coordinates.length]
    ) +
    getDistance(
      coordinates[nodeIdx1 + 1],
      coordinates[(nodeIdx2 + 1) % coordinates.length]
    ) +
    getDistance(coordinates[nodeIdx1], coordinates[nodeIdx2])
  );
}

/**
 * Applies a 2-opt swap to the given coordinates so that nodeIdx1 --> nodeIdx2
 * The indices must satisfy `nodeIdx2 > nodeIdx1`.
 */
function applyTwoOptSwap(
  coordinates: Coordinate[],
  nodeIdx1: number,
  nodeIdx2: number
): Coordinate[] {
  return [
    ...coordinates.slice(0, nodeIdx1 + 1),
    ...coordinates.slice(nodeIdx1 + 1, nodeIdx2 + 1).reverse(),
    ...coordinates.slice(nodeIdx2 + 1),
  ];
}

/**
 * Applies a 3-opt swap to the given coordinates. So that nodeIdx1 --> nodeIdx2
 * The indices must satisfy `nodeIdx3 > nodeIdx2 > nodeIdx1`.
 */
function applyThreeOptSwap(
  coordinates: Coordinate[],
  nodeIdx1: number,
  nodeIdx2: number,
  nodeIdx3: number
): Coordinate[] {
    return [
      ...coordinates.slice(0, nodeIdx1 + 1),
      // 1 --> 2 -------> 1s old neighboud
      ...coordinates.slice(nodeIdx1 + 1, nodeIdx2 + 1).reverse(),
      //1st old neightbout ---> 3  -------> 2
      ...coordinates.slice(nodeIdx2 + 1, nodeIdx3 + 1).reverse(),
      ...coordinates.slice(nodeIdx3 + 1),
    ];
//   return [
//     ...coordinates.slice(0, nodeIdx1 + 1),
//     ...coordinates.slice(nodeIdx2 + 1, nodeIdx3 + 1).reverse(),
//     ...coordinates.slice(nodeIdx1 + 1, nodeIdx2),
//     ...coordinates.slice(nodeIdx3 + 1),
//   ];
}

/**
 * Calculates the change in tour length resulting from a 3-opt swap.
 * The indices must satisfy `nodeIdx3 > nodeIdx2 > nodeIdx1`.
 */
function getThreeOptDelta(
  coordinates: Coordinate[],
  nodeIdx1: number,
  nodeIdx2: number,
  nodeIdx3: number
): number {
  return (
    getDistance(coordinates[nodeIdx1], coordinates[nodeIdx2]) +
    getDistance(coordinates[nodeIdx1 + 1], coordinates[nodeIdx3]) +
    getDistance(coordinates[nodeIdx2 + 1], coordinates[nodeIdx3 + 1]) -
    getDistance(coordinates[nodeIdx1], coordinates[nodeIdx1 + 1]) -
    getDistance(coordinates[nodeIdx2], coordinates[nodeIdx2 + 1]) -
    getDistance(coordinates[nodeIdx3], coordinates[nodeIdx3 + 1])
  );
}

function getTotalDistance(coordinates: Coordinate[]) {
  if (coordinates.length === 0) return 0;

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    totalDistance += getDistance(start, end);
  }
  totalDistance += getDistance(
    coordinates[coordinates.length - 1],
    coordinates[0]
  );
  return totalDistance;
}

function applyLocalSearchTwoOpt(
  coordinates: Coordinate[],
  thresh: number,
  maxIt: number,
  startTime: number
) {
  let searchCoords = [...coordinates];
  let improvementFound = true;
  let count = 0;
  while (improvementFound && count < maxIt) {
    improvementFound = false;
    for (let nodeIdx = 0; nodeIdx < coordinates.length - 1; nodeIdx++) {
      let bestImprovementNode = -1;
      let currentNodeImprovement = 0;
      for (
        let neighbourIdx = nodeIdx + 2;
        neighbourIdx < coordinates.length;
        neighbourIdx++
      ) {
        let swapDelta = getlengthDelta(searchCoords, nodeIdx, neighbourIdx);
        if (swapDelta < -thresh) {
          improvementFound = true;
          if (swapDelta < currentNodeImprovement) {
            currentNodeImprovement = swapDelta;
            bestImprovementNode = neighbourIdx;
          }
        }
        count += 1;
      }
      if (currentNodeImprovement < -thresh) {
        searchCoords = applyTwoOptSwap(
          searchCoords,
          nodeIdx,
          bestImprovementNode
        );
      }
    }
  }
  return searchCoords;
}

function applyLocalSearchThreeOpt(
  coordinates: Coordinate[],
  thresh: number,
  maxIt: number
): Coordinate[] {
  let searchCoords = [...coordinates];
  let improvementFound = true;
  let count = 0;
  let tot = getTotalDistance(searchCoords);
  while (improvementFound && count < maxIt) {
    improvementFound = false;
    for (let nodeIdx1 = 0; nodeIdx1 < coordinates.length - 3; nodeIdx1++) {
      let bestImprovementNodes = [-1, -1];
      let currentNodeImprovement = 0;
      for (
        let nodeIdx2 = nodeIdx1 + 1;
        nodeIdx2 < coordinates.length - 2;
        nodeIdx2++
      ) {
        for (
          let nodeIdx3 = nodeIdx2 + 1;
          nodeIdx3 < coordinates.length - 1;
          nodeIdx3++
        ) {
          let swapDelta = getThreeOptDelta(
            searchCoords,
            nodeIdx1,
            nodeIdx2,
            nodeIdx3
          );
          if (swapDelta < -thresh) {
            improvementFound = true;
            if (swapDelta < currentNodeImprovement) {
              currentNodeImprovement = swapDelta;
              bestImprovementNodes = [nodeIdx2, nodeIdx3];
            }
          }
          count += 1;
        }
      }
      if (currentNodeImprovement < -thresh) {
        const [nodeIdx2, nodeIdx3] = bestImprovementNodes;
        searchCoords = applyThreeOptSwap(
          searchCoords,
          nodeIdx1,
          nodeIdx2,
          nodeIdx3
        );
        tot += currentNodeImprovement;
        console.log(tot);
      }
    }
  }
  console.log(count);
  return searchCoords;
}

function applySimmulatedAnnealingSearch(
  coordinates: Coordinate[],
  iterations: number,
  initialTemp: number
) {
  let seq = [];
  let searchCoords = [...coordinates];
  let count = 0;
  let temp = initialTemp;
  while (count < iterations) {
    let nodes = sampleSize(Array.from(searchCoords.keys()), 2);
    let nodeIdx = Math.min(...nodes);
    let neighbourIdx = Math.max(...nodes);
    let swapDelta = getlengthDelta(searchCoords, nodeIdx, neighbourIdx);
    let rand = Math.random();
    if (swapDelta < 0 || Math.exp(-swapDelta / temp) > rand) {
      searchCoords = applyTwoOptSwap(searchCoords, nodeIdx, neighbourIdx);
      seq.push(getTotalDistance(searchCoords));
    }
    temp *= (1 - (count + 1) / iterations) ** 0.25;
    count += 1;
  }
  return searchCoords;
}

//tsp_33810_1 67700000
//tsp_1889_1 323000
// tsp_574_1 37600

// let permutations = _.combinations([1,2,3,4,5,7], 3);

// console.log(permutations);

const filePath = join(__dirname, "data/tsp_574_1");
const inputCoordinates = parseFileToCoordinates(filePath);

const greedySol = getGreedySolution(inputCoordinates);
console.log("greedy", getTotalDistance(greedySol));

const greedyJsonString = JSON.stringify(greedySol, null, 2);
writeFileSync("greedy.json", greedyJsonString, "utf8");

// const twoOptString = JSON.stringify(twoOpt, null, 2);
// writeFileSync("twoOpt.json", twoOptString, "utf8");

const v1 = 30;
const v2 = 31;
// const v3 = 210;
const delta = getlengthDelta(greedySol, v1, v2);
console.log(delta);

const totDist = getTotalDistance(greedySol);
const swappedSol = applyTwoOptSwap(greedySol, v1, v2);
// const swappedSol = applyThreeOptSwap(greedySol, v1, v2, v3);
// // check delta calc works
console.log(totDist + delta - getTotalDistance(swappedSol));

const twoOpt = applyLocalSearchTwoOpt(greedySol, 1e-6, 1e6, 0);
console.log("2 opt", getTotalDistance(twoOpt));
const twoOptString = JSON.stringify(twoOpt, null, 2);
writeFileSync("twoOpt.json", twoOptString, "utf8");

const threeOpt = applyLocalSearchThreeOpt(twoOpt, 1e-12, 1e10);
console.log("3 opt", getTotalDistance(threeOpt));
// const threeOptString = JSON.stringify(threeOpt, null, 2);
// writeFileSync("threeOpt.json", threeOptString, "utf8");

// function threeOpt(
//   coordinates: number[],
//   nodeIdx1: number,
//   nodeIdx2: number,
//   nodeIdx3: number
// ): number[] {
//   // return [
//   //   ...coordinates.slice(0, nodeIdx1 + 1),
//   //   ...coordinates.slice(nodeIdx1 + 1, nodeIdx2 + 1).reverse(),
//   //   ...coordinates.slice(nodeIdx2 + 1, nodeIdx3 + 1).reverse(),
//   //   ...coordinates.slice(nodeIdx3 + 1),
//   // ];
//   return [
//     ...coordinates.slice(0, nodeIdx1 + 1),
//     ...coordinates.slice(nodeIdx2 + 1, nodeIdx3 + 1).reverse(),
//     ...coordinates.slice(nodeIdx1 + 1, nodeIdx2),
//     ...coordinates.slice(nodeIdx3 + 1),
//   ];
// }

// console.log(threeOpt([1, 2, 3, 4, 5, 6, 7, 8], 3, 5, 7));
