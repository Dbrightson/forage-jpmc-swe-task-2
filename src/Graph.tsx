import React, { Component } from 'react';
import { Table } from '@finos/perspective';
import { ServerRespond } from './DataStreamer';
import './Graph.css';

/**
 * Props declaration for <Graph />
 */
interface IProps {
  data: ServerRespond[],
}

/**
 * Perspective library adds load to HTMLElement prototype.
 * This interface acts as a wrapper for Typescript compiler.
 */
interface PerspectiveViewerElement extends HTMLElement {
  load: (table: Table) => void,
}

/**
 * React component that renders Perspective based on data
 * parsed from its parent through data property.
 */
class Graph extends Component<IProps, {}> {
  // Perspective table
  table: Table | undefined;

  render() {
    return React.createElement('perspective-viewer');
  }

  componentDidMount() {
    // Get element to attach the table from the DOM.
    const elem = document.getElementsByTagName('perspective-viewer')[0] as unknown as PerspectiveViewerElement;

    const schema = {
      stock: 'string',
      top_ask_price: 'float',
      top_bid_price: 'float',
      timestamp: 'date',
    };

    if (window.perspective && window.perspective.worker()) {
      this.table = window.perspective.worker().table(schema);
    }
    if (this.table) {
      // Load the `table` in the `<perspective-viewer>` DOM reference.

      // Add more Perspective configurations here.
      elem.load(this.table);
      elem.setAttribute('view', 'y_line');
      elem.setAttribute('column-pivots', '["stock"]');
      elem.setAttribute('row-pivots', '["timestamp"]');
      elem.setAttribute('columns', '["top_ask_price"]');
      elem.setAttribute('aggregates', `
        {
          "stock": "distinct count",
          "top_ask_price": "avg",
          "top_bid_price": "avg",
          "timestamp": "distinct count"
        }`);
    }
  }

  componentDidUpdate() {
    // Everytime the data props is updated, insert the data into Perspective table
    if (this.table) {
      // To handle duplicate data, use a Map to store unique entries
      const dataMap = new Map<string, any>();
      this.props.data.forEach((el: any) => {
        const key = `${el.stock}-${el.timestamp}`;
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            stock: el.stock,
            top_ask_price: el.top_ask && el.top_ask.price || 0,
            top_bid_price: el.top_bid && el.top_bid.price || 0,
            timestamp: el.timestamp,
          });
        } else {
          // Update the existing entry by averaging the prices
          const existing = dataMap.get(key);
          dataMap.set(key, {
            ...existing,
            top_ask_price: (existing.top_ask_price + (el.top_ask && el.top_ask.price || 0)) / 2,
            top_bid_price: (existing.top_bid_price + (el.top_bid && el.top_bid.price || 0)) / 2,
          });
        }
      });

      // Convert the map back to an array
      const uniqueData = Array.from(dataMap.values());
      this.table.update(uniqueData);
    }
  }
}

export default Graph;
