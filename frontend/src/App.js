import React, {Component} from 'react';
import './App.css';
import Graph from "react-graph-vis";
import Colors from "./Colors";
import Node from "./images/node.png"
import Edge from "./images/edge.png"
import UnsatisfiedEdge from "./images/unsatisfied_edge.png"
import UnsatisfiedNode from "./images/unsatisfied_node.png"

class App extends Component {
    constructor() {
        super();
        this.state = {
                nodes: [],
                edges: []
        }
        const PORT  = process.env.WEBSOCKET_PORT || 6060;
        this.ws = new WebSocket(`ws://localhost:${PORT}/metrics`);
    }

    resolveDependencyIfUnknown = (dependencies) => dependencies || [];

    generateNodesList = (dependencyGraph) => Object.keys(dependencyGraph).map((node, index) => {
        return {
            id: node,
            label: node,
            title: node,
            color: Colors[Math.floor(Math.random() * Colors.length)],
            shape: "dot",
        }
    });

    generateUnsatisfiedNodeList = (unsatisfiedNodeList) => {
        return unsatisfiedNodeList.map((node) => {
            return {
                id: node,
                label: node,
                title: node,
                color: '#000000',
                shape: "triangle",
                font: {
                    color: '#000000'
                }
            }
        })
    }

    generateEdgesListFromDependencyGraph = (dependencyGraph) => {
        const edges = [];
        for(const node of Object.keys(dependencyGraph)) {
            for (const neighbour of this.resolveDependencyIfUnknown(dependencyGraph[node].dependencies)) {
                const state = {to: node, from: neighbour}
                if(!dependencyGraph[neighbour]) {
                    state.dashes = true
                }
                edges.push(state)
            }
        }

        return edges;
    }

    generateEdgesListFromCycleList = (cycleData) => {
        const edges = []
        for(const list of cycleData.stackHistory) {
            for(let i = list.length-1; i > 0; i--) {
                edges.push({from: list[i], to: list[i-1]})
            }
        }
        return edges
    }

    componentDidMount() {
        this.ws.onmessage = (event) => {
            const metrics = JSON.parse(event.data);
            console.log(metrics)
            const state = {...this.state}
            state.nodes = [
                ...this.generateNodesList(metrics.dependencyGraph),
                ...this.generateUnsatisfiedNodeList(metrics.unsatisfiedDependencies)
            ]
            state.edges = [
                ...this.generateEdgesListFromDependencyGraph(metrics.dependencyGraph),
                ...this.generateEdgesListFromCycleList(metrics.cycleData)
            ]
            console.log(state)
            this.setState(state);
        };
    }

    render() {
        const options = {
            edges: {
                color: "#000000",
                smooth: {
                    type: "dynamic",
                }
            },
            nodes: {
                mass: 1,
            },
            height: "800px",
            layout: {
                randomSeed: Math.random(),
            },
        };
        const legendImageSize = "40rem";
        return (
            <>
            <Graph
                key={Math.random().toString(7)}
                graph={this.state}
                options={options}
            />
            <div>
            <p>Legends</p>
               <table>
                   <thead>
                       <tr>
                           <th>
                               Key
                           </th>
                           <th>
                               Legend
                           </th>
                       </tr>
                   </thead>
                   <tbody>
                       <tr>
                           <td>
                               <img width={legendImageSize} src={Node} alt={"Node"}></img>
                           </td>
                           <td>
                               Node
                           </td>
                       </tr>
                       <tr>
                           <td>
                               <img width={legendImageSize} src={Edge} alt={"Edge"}></img>
                           </td>
                           <td>
                               Edge
                           </td>
                       </tr>
                       <tr>
                           <td>
                               <img width={legendImageSize} src={UnsatisfiedEdge} alt={"UnsatisfiedEdge"}></img>
                           </td>
                           <td>
                               Unsatisfied Edge
                           </td>
                       </tr>
                       <tr>
                           <td>
                               <img width={legendImageSize} src={UnsatisfiedNode} alt={"UnsatisfiedNode"}></img>
                           </td>
                           <td>
                               Unsatisfied Node
                           </td>
                       </tr>
                   </tbody>
               </table>
            </div>
            </>
        );
    }
}

export default App;
