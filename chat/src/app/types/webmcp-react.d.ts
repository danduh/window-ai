// JSX typing for the declarative WebMCP attributes, so a React-rendered
// <form toolname="…"> type-checks. React 19 passes unknown lowercase attributes
// through to the DOM unchanged. Pass `toolautosubmit=""` (a string): React drops
// a boolean `true` on unknown attributes.
// Spec: https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md
export {};

/* eslint-disable @typescript-eslint/no-unused-vars */
declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: '';
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}
