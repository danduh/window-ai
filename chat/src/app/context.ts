import { createContext } from 'react';

const contextObject = {inIframe:false}
export const AppContext = createContext(contextObject);

