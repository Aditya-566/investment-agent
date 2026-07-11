import { StateGraph, Annotation } from '@langchain/langgraph';
import financialNode from './nodes/financialNode.js';
import newsNode from './nodes/newsNode.js';
import analystNode from './nodes/analystNode.js';
import decisionNode from './nodes/decisionNode.js';

// Define the LangGraph State Schema
const StateAnnotation = Annotation.Root({
  ticker: Annotation(),
  companyName: Annotation(),
  financials: Annotation(),
  news: Annotation(),
  newsSentiment: Annotation(),
  analystEstimates: Annotation(),
  decision: Annotation(),
  error: Annotation()
});

// Build the LangGraph Workflow
const workflow = new StateGraph(StateAnnotation)
  // Add processing nodes
  .addNode('financials', financialNode)
  .addNode('news', newsNode)
  .addNode('analyst', analystNode)
  .addNode('decision', decisionNode)

  // Define edges
  // Parallel execution for financial analysis, news sentiment, and analyst estimates
  .addEdge('__start__', 'financials')
  .addEdge('__start__', 'news')
  .addEdge('__start__', 'analyst')

  // Fan-in / Join at decision node once parallel nodes complete
  .addEdge('financials', 'decision')
  .addEdge('news', 'decision')
  .addEdge('analyst', 'decision')

  // Terminate after decision is generated
  .addEdge('decision', '__end__');

// Compile the graph
const graph = workflow.compile();

export { graph, StateAnnotation };
export default graph;
