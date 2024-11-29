import React from "react";
import {DocsRenderer} from "../tools/DocsRenderer";

export const HomePage: React.FC = () => {
  return (
    <div className="app">
      <DocsRenderer docFile="Home.md" initOpen={true}></DocsRenderer>
    </div>
  )
}
